import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auditMesh, closeEnds, deepen, meshSpeech, nextDerivative, truthMesh } from './truthmesh.ts'
import { HYPOTHESIS } from './hypothesis.ts'

test('the mesh closes from floor to ceiling and adds no contents', async () => {
  const held = [
    { name: 'Dawn', at: '2000-01-01T00:00:00Z' },
    { name: 'Noon', at: '2000-01-01T06:00:00Z' },
    { name: 'Dusk', at: '2000-01-01T12:00:00Z' },
  ]
  const nodes = truthMesh(held)
  assert.equal(nodes.filter(node => node.level === 'floor').length, 3)
  assert.equal(nodes.filter(node => node.level === 'up').length, 2)
  assert.equal(nodes.find(node => node.level === 'ceiling')?.claim, HYPOTHESIS)
  assert.equal(nodes.filter(node => node.level === 'down').length, 2)
  assert.match(nodes.find(node => node.level === 'down')?.claim ?? '', /adds no contents/)
  assert.equal(nextDerivative(nodes).length, 0)
  assert.match(meshSpeech(nodes), /does not fill a hole/)
  assert.equal(await auditMesh(nodes), await auditMesh(truthMesh(held)))
  const deep = deepen(held, [{ name: 'Mid', at: '2000-01-01T03:00:00Z' }])
  assert.equal(deep.joints.filter(joint => !joint.end).length, 1)
  assert.equal(deep.ties.length, 2)
  const shell = closeEnds(deep.joints)
  assert.equal(shell.length, 3)
  assert.ok(shell.every(tie => deep.joints[tie.from].end && deep.joints[tie.to].end))
  assert.match(meshSpeech(nodes, deep.ties.length, shell.length), /at once/)
  assert.match(meshSpeech(nodes, deep.ties.length), /sit deeper/)
})
