import assert from 'node:assert/strict'
import { test } from 'node:test'
import { boundaryWords, compareMethods, historySpeech, matrixSpot, PICTURE, SPOTS, supplyReal, takePerspective, truthMeshScene, verifyMinute } from './history.ts'

test('a sourced minute shortens the simulation and does not overwrite a held one', () => {
  assert.equal(PICTURE.length, 5)
  assert.match(historySpeech('the picture of history') ?? '', /not loaded/)
  const added = supplyReal(PICTURE, { at: '1969-07-18T12:00:00Z', name: 'A coast', source: 'a log' })
  assert.equal(added.held.length, 6)
  assert.match(added.words, /shorter/)
  const clash = supplyReal(PICTURE, { at: '1969-07-20T20:17:40Z', name: 'Somewhere else', source: 'a log' })
  assert.equal(clash.held.length, 5)
  assert.match(clash.words, /not written over/)
  const empty = supplyReal(PICTURE, { at: '1969-07-18T12:00:00Z', name: 'A coast', source: '  ' })
  assert.match(empty.words, /Chat is not a source/)
  assert.equal(SPOTS.length, 4)
  assert.equal(matrixSpot('translunar injection'), null)
  assert.equal(matrixSpot('tranquility')?.body, 'moon')
  assert.equal(matrixSpot('launch pad 39a')?.body, 'earth')
  assert.match(historySpeech('matrix') ?? '', /not a seed/)
  assert.match(historySpeech('any perspective of the truth') ?? '', /second distinct source/)
})

test('any perspective is kept and audited, and a child\'s mark is not', async () => {
  const one = await takePerspective({ name: 'The landing', at: '1969-07-20T20:17:39Z', place: 'Tranquility Base', perspective: 'from the cabin', source: 'a log' })
  const two = await takePerspective({ name: 'The landing', at: '1969-07-20T20:17:39Z', place: 'Tranquility Base', perspective: 'from the ground', source: 'a log' })
  assert.equal(one.held?.audit.length, 64)
  assert.notEqual(one.held?.perspective, two.held?.perspective)
  assert.match(two.words, /Not verified|not verified|sources agree/)
  const child = await takePerspective({ name: 'A roster', at: '1969-07-20T20:17:39Z', place: 'A rink', perspective: 'a coach', source: 'the children' })
  assert.equal(child.held, null)
  const bare = await takePerspective({ name: 'A minute', at: '2001-01-01T00:00:00Z', place: 'Here', perspective: 'from the street', source: '  ' })
  assert.match(bare.words, /Chat is not a source/)
})

test('two distinct sources verify a minute, and the same source twice does not', () => {
  const minute = [
    { name: 'The landing', at: '1969-07-20T20:17:39Z', place: 'Tranquility Base', lat: null, lon: null, perspective: 'from the cabin', source: 'a log', audit: 'a' },
    { name: 'The landing', at: '1969-07-20T20:17:39Z', place: 'Tranquility Base', lat: null, lon: null, perspective: 'from the ground', source: 'a log', audit: 'b' },
  ]
  assert.match(verifyMinute('Tranquility Base', '1969-07-20T20:17:39Z', minute).words, /not verified/)
  const agreed = [...minute, { ...minute[0], source: 'a second log', perspective: 'from the cabin', audit: 'c' }]
  assert.match(verifyMinute('Tranquility Base', '1969-07-20T20:17:39Z', agreed).words, /verified/)
  const clash = [...agreed, { ...minute[0], name: 'A different landing', source: 'a third log', audit: 'd' }]
  assert.match(verifyMinute('Tranquility Base', '1969-07-20T20:17:39Z', clash).words, /Not verified/)
  assert.match(historySpeech('multi-source') ?? '', /20:17:39 and 20:17:40/)
  assert.match(historySpeech('second source') ?? '', /Liftoff/)
  assert.match(verifyMinute('Launch pad 39A', '1969-07-16T13:32:00Z').words, /verified/)
  assert.match(verifyMinute('Tranquility Base', '1969-07-20T20:17:39Z').words, /Not verified/)
  const compared = compareMethods()
  assert.match(compared, /does not weigh/)
  assert.match(historySpeech('compare verification methods') ?? '', /published record is one source/)
  assert.match(boundaryWords(), /not a world hole/)
  assert.match(historySpeech('lost time and space-time') ?? '', /same place/)
  const mesh = truthMeshScene()
  assert.equal(mesh.joints.filter(joint => joint.grade === 'two').length, 2)
  assert.equal(mesh.joints.filter(joint => joint.grade === 'conflict').length, 1)
  assert.match(mesh.speech, /not two instruments/)
  assert.match(mesh.speech, /cannot be mistaken/)
})



