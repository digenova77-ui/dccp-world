import * as THREE from 'three'

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`

export class IrisOrb {
  readonly group = new THREE.Group()
  readonly core: THREE.Mesh
  private mat: THREE.ShaderMaterial
  private rings: THREE.Line[] = []
  private halo: THREE.Mesh
  private awake = 0
  private awakeTarget = 0.25

  constructor(radius = 1.6, detail = 5) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uAwake: { value: 0.25 }, uHue: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uLevel; uniform float uAwake;
        varying vec3 vN; varying vec3 vP; varying float vD;
        ${NOISE}
        void main(){
          vec3 p = position;
          float n = snoise(normalize(p)*1.6 + vec3(0.0, uTime*0.35, uTime*0.22));
          float n2 = snoise(normalize(p)*4.0 - vec3(uTime*0.8));
          float d = (0.05 + 0.22*uLevel) * n + 0.06*uLevel*n2 + 0.015*uAwake*sin(uTime*2.0);
          p += normal * d;
          vD = d;
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          vP = mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uLevel; uniform float uAwake; uniform float uHue;
        varying vec3 vN; varying vec3 vP; varying float vD;
        ${NOISE}
        void main(){
          vec3 V = normalize(-vP);
          float fres = pow(1.0 - max(dot(vN, V), 0.0), 2.2);
          float swirl = snoise(vec3(vN.xy*2.2, uTime*0.25)) * 0.5 + 0.5;
          vec3 teal = vec3(0.08, 0.72, 0.65);
          vec3 iris = vec3(0.56, 0.71, 0.78);
          vec3 earth = vec3(0.55, 0.42, 0.22);
          vec3 violet = vec3(0.66, 0.33, 0.97);
          vec3 c = mix(teal, earth, smoothstep(0.35, 0.85, swirl));
          c = mix(c, iris, 0.35 + 0.3*sin(uTime*0.4 + vD*20.0));
          c = mix(c, violet, uHue * 0.6);
          float glow = 0.35 + 0.9*uAwake + 1.6*uLevel;
          vec3 col = c * (0.25 + 0.75*swirl) * glow + fres * (iris + 0.6*teal) * (0.8 + 2.2*uLevel);
          gl_FragColor = vec4(col, 0.92);
        }`,
      transparent: true,
    })
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), this.mat)
    this.core.name = 'iris-orb'
    this.group.add(this.core)
    for (let r = 0; r < 3; r++) {
      const n = 128
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
      const line = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: [0x14b8a6, 0x8eb4c8, 0xa855f7][r], transparent: true, opacity: 0.75 }))
      line.rotation.x = Math.PI / 2 + (r - 1) * 0.35
      line.rotation.y = r * 0.6
      line.userData.base = radius * (1.35 + r * 0.22)
      this.rings.push(line)
      this.group.add(line)
    }
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.9, 32, 16), new THREE.ShaderMaterial({
      uniforms: { uLevel: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform float uLevel; varying vec3 vN; varying vec3 vP; void main(){ float f=pow(1.0-abs(dot(vN,normalize(-vP))),3.0); gl_FragColor=vec4(vec3(0.1,0.75,0.7)*f*(0.5+uLevel*1.5), f*0.6); }',
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    }))
    this.group.add(this.halo)
  }

  setAwake(on: boolean): void {
    this.awakeTarget = on ? 1 : 0.25
  }

  /** level: 0..1 combined speech + mic; spectrum: analyser bins (0..255); hue 0 teal .. 1 violet (speaking) */
  update(dt: number, t: number, level: number, spectrum: Uint8Array, hue: number): void {
    this.awake += (this.awakeTarget - this.awake) * Math.min(1, dt * 3)
    const u = this.mat.uniforms
    u.uTime.value = t
    u.uLevel.value += (level - u.uLevel.value) * Math.min(1, dt * 14)
    u.uAwake.value = this.awake
    u.uHue.value += (hue - u.uHue.value) * Math.min(1, dt * 4)
    ;((this.halo.material as THREE.ShaderMaterial).uniforms.uLevel.value as number) = u.uLevel.value
    this.core.rotation.y += dt * (0.15 + level * 0.8)
    for (let r = 0; r < this.rings.length; r++) {
      const line = this.rings[r]
      const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute
      const n = pos.count
      const base = line.userData.base as number
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const bin = spectrum[(i + r * 11) % 48] / 255
        const wave = Math.sin(a * (6 + r * 3) + t * (2 + r)) * (0.05 + 0.35 * u.uLevel.value) + bin * 0.5
        const rad = base * (1 + wave * 0.18 * (0.4 + this.awake))
        pos.setXYZ(i, Math.cos(a) * rad, Math.sin(a) * rad, Math.sin(a * 3 + t) * 0.04)
      }
      pos.needsUpdate = true
      line.rotation.z += dt * (0.1 + r * 0.05) * (r % 2 ? -1 : 1)
      ;(line.material as THREE.LineBasicMaterial).opacity = 0.3 + 0.6 * this.awake
    }
  }
}
