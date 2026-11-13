import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { runInNewContext } from 'node:vm'

const requireDependency = createRequire(import.meta.url)
const packageRoot = dirname(requireDependency.resolve('react-native-draggable-flatlist/package.json'))
const source = readFileSync(join(packageRoot, 'src/components/DraggableFlatList.tsx'), 'utf8')
const start = source.indexOf('  const dataHasChanged =')
const end = source.indexOf('\n  useEffect(', start)
const updateData = source.slice(start, end)

describe('draggable-flatlist RN 0.88 compatibility patch', () => {
  it('defers reset after ordered keys change without the removed InteractionManager', () => {
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const reset = jest.fn()
    const schedule = jest.fn()
    const context = {
      dataRef: { current: [{ id: 'squat' }, { id: 'press' }] },
      props: { data: [{ id: 'press' }, { id: 'squat' }] },
      keyExtractor: item => item.id,
      activeKey: 'squat',
      reset,
      setTimeout: schedule,
    }

    runInNewContext(updateData, context)

    expect(context.activeKey).toBeNull()
    expect(context.dataRef.current).toBe(context.props.data)
    expect(reset).not.toHaveBeenCalled()
    expect(schedule).toHaveBeenCalledWith(reset, 0)
    schedule.mock.calls[0][0]()
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('does not schedule a reset when ordered keys are unchanged', () => {
    const schedule = jest.fn()
    const context = {
      dataRef: { current: [{ id: 'squat' }, { id: 'press' }] },
      props: { data: [{ id: 'squat' }, { id: 'press' }] },
      keyExtractor: item => item.id,
      activeKey: 'squat',
      reset: jest.fn(),
      setTimeout: schedule,
    }

    runInNewContext(updateData, context)

    expect(context.activeKey).toBe('squat')
    expect(schedule).not.toHaveBeenCalled()
  })
})
