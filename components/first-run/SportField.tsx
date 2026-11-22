import React, { useMemo } from 'react'
import Svg, { Path } from 'react-native-svg'
import { FIELD_BOX, sportField, type FieldStroke } from '../../lib/sportFields'

const WIDTH: Record<FieldStroke, number> = { line: 2, heavy: 3.5, dash: 2, dot: 3, fill: 0 }
const DASH: Partial<Record<FieldStroke, string>> = { dash: '10 8', dot: '0.1 9' }

/** The sport's field in chalk lines, one color, cropped by whatever holds it. */
export function SportField({ name, size, color }: { name: string; size: number; color: string }) {
  const marks = useMemo(() => sportField(name), [name])
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${FIELD_BOX} ${FIELD_BOX}`} testID={`sport-field-${name}`}>
      {marks.map((mark, i) => (
        <Path
          key={i}
          d={mark.d}
          fill={mark.stroke === 'fill' ? color : 'none'}
          stroke={mark.stroke === 'fill' ? 'none' : color}
          strokeWidth={WIDTH[mark.stroke]}
          strokeDasharray={DASH[mark.stroke]}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  )
}
