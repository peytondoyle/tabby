/**
 * Lightweight CSS-in-JS utility for iOS Design System
 * Zero runtime overhead for static styles, type-safe design token access
 */

import React from 'react'
import { designTokens, type DesignTokens } from '../styles/ios-design'

// ============================================================================
// TYPES
// ============================================================================

type ResponsiveValue<T> = T | { sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T }
type PseudoProps = {
  hover?: React.CSSProperties
  active?: React.CSSProperties
  focus?: React.CSSProperties
  disabled?: React.CSSProperties
}

type StyledProps = {
  // Spacing
  p?: ResponsiveValue<keyof typeof designTokens.spacing>
  px?: ResponsiveValue<keyof typeof designTokens.spacing>
  py?: ResponsiveValue<keyof typeof designTokens.spacing>
  pt?: ResponsiveValue<keyof typeof designTokens.spacing>
  pr?: ResponsiveValue<keyof typeof designTokens.spacing>
  pb?: ResponsiveValue<keyof typeof designTokens.spacing>
  pl?: ResponsiveValue<keyof typeof designTokens.spacing>
  m?: ResponsiveValue<keyof typeof designTokens.spacing>
  mx?: ResponsiveValue<keyof typeof designTokens.spacing>
  my?: ResponsiveValue<keyof typeof designTokens.spacing>
  mt?: ResponsiveValue<keyof typeof designTokens.spacing>
  mr?: ResponsiveValue<keyof typeof designTokens.spacing>
  mb?: ResponsiveValue<keyof typeof designTokens.spacing>
  ml?: ResponsiveValue<keyof typeof designTokens.spacing>
  
  // Layout
  w?: ResponsiveValue<string | number>
  h?: ResponsiveValue<string | number>
  minW?: ResponsiveValue<string | number>
  minH?: ResponsiveValue<string | number>
  maxW?: ResponsiveValue<string | number>
  maxH?: ResponsiveValue<string | number>
  
  // Flexbox
  flex?: ResponsiveValue<boolean | number | string>
  direction?: ResponsiveValue<'row' | 'column' | 'row-reverse' | 'column-reverse'>
  align?: ResponsiveValue<'start' | 'end' | 'center' | 'stretch' | 'baseline'>
  justify?: ResponsiveValue<'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'>
  wrap?: ResponsiveValue<boolean | 'wrap' | 'nowrap' | 'wrap-reverse'>
  gap?: ResponsiveValue<keyof typeof designTokens.spacing>
  
  // Colors
  bg?: keyof typeof designTokens.semantic.background | keyof typeof designTokens.colors.gray | keyof typeof designTokens.colors.blue
  color?: keyof typeof designTokens.semantic.text | keyof typeof designTokens.colors.gray | keyof typeof designTokens.colors.blue
  borderColor?: keyof typeof designTokens.semantic.border | keyof typeof designTokens.colors.gray
  
  // Typography
  fontSize?: keyof typeof designTokens.typography.fontSize
  fontWeight?: keyof typeof designTokens.typography.fontWeight
  lineHeight?: keyof typeof designTokens.typography.lineHeight
  textAlign?: ResponsiveValue<'left' | 'center' | 'right' | 'justify'>
  
  // Border
  border?: ResponsiveValue<boolean | string>
  borderWidth?: ResponsiveValue<number | string>
  borderRadius?: keyof typeof designTokens.borderRadius
  
  // Shadow
  shadow?: keyof typeof designTokens.shadows
  
  // Position
  position?: ResponsiveValue<'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'>
  top?: ResponsiveValue<string | number>
  right?: ResponsiveValue<string | number>
  bottom?: ResponsiveValue<string | number>
  left?: ResponsiveValue<string | number>
  zIndex?: keyof typeof designTokens.zIndex
  
  // Display
  display?: ResponsiveValue<'block' | 'inline' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'none'>
  
  // Overflow
  overflow?: ResponsiveValue<'visible' | 'hidden' | 'scroll' | 'auto'>
  overflowX?: ResponsiveValue<'visible' | 'hidden' | 'scroll' | 'auto'>
  overflowY?: ResponsiveValue<'visible' | 'hidden' | 'scroll' | 'auto'>
  
  // Pseudo states
  _hover?: React.CSSProperties
  _active?: React.CSSProperties
  _focus?: React.CSSProperties
  _disabled?: React.CSSProperties
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getSpacingValue = (key: keyof typeof designTokens.spacing): string => {
  return designTokens.spacing[key]
}

const getColorValue = (colorKey: string): string => {
  // Handle semantic colors
  if (colorKey in designTokens.semantic.background) {
    return designTokens.semantic.background[colorKey as keyof typeof designTokens.semantic.background]
  }
  if (colorKey in designTokens.semantic.text) {
    return designTokens.semantic.text[colorKey as keyof typeof designTokens.semantic.text]
  }
  if (colorKey in designTokens.semantic.border) {
    return designTokens.semantic.border[colorKey as keyof typeof designTokens.semantic.border]
  }
  // Handle gray scale
  if (colorKey in designTokens.colors.gray) {
    return designTokens.colors.gray[colorKey as keyof typeof designTokens.colors.gray]
  }
  // Handle blue scale
  if (colorKey in designTokens.colors.blue) {
    return designTokens.colors.blue[colorKey as keyof typeof designTokens.colors.blue]
  }
  return colorKey
}

const getFontSize = (key: keyof typeof designTokens.typography.fontSize): string => {
  return designTokens.typography.fontSize[key]
}

const getFontWeight = (key: keyof typeof designTokens.typography.fontWeight): number => {
  return designTokens.typography.fontWeight[key]
}

const getLineHeight = (key: keyof typeof designTokens.typography.lineHeight): number => {
  return designTokens.typography.lineHeight[key]
}

const getBorderRadius = (key: keyof typeof designTokens.borderRadius): string => {
  return designTokens.borderRadius[key]
}

const getShadow = (key: keyof typeof designTokens.shadows): string => {
  return designTokens.shadows[key]
}

const getZIndex = (key: keyof typeof designTokens.zIndex): number => {
  return designTokens.zIndex[key]
}

// ============================================================================
// STYLED COMPONENT CREATOR
// ============================================================================

export const styled = <T extends keyof JSX.IntrinsicElements>(
  element: T
) => {
  return (props: StyledProps & React.ComponentProps<T>) => {
    const {
      // Spacing
      p, px, py, pt, pr, pb, pl,
      m, mx, my, mt, mr, mb, ml,
      
      // Layout
      w, h, minW, minH, maxW, maxH,
      
      // Flexbox
      flex, direction, align, justify, wrap, gap,
      
      // Colors
      bg, color, borderColor,
      
      // Typography
      fontSize, fontWeight, lineHeight, textAlign,
      
      // Border
      border, borderWidth, borderRadius,
      
      // Shadow
      shadow,
      
      // Position
      position, top, right, bottom, left, zIndex,
      
      // Display
      display,
      
      // Overflow
      overflow, overflowX, overflowY,
      
      // Pseudo states
      _hover, _active, _focus, _disabled,
      
      // Extract other props
      ...restProps
    } = props

    // Build styles object
    const styles: React.CSSProperties = {}

    // Spacing
    if (p) styles.padding = typeof p === 'string' ? getSpacingValue(p) : p
    if (px) styles.paddingLeft = styles.paddingRight = typeof px === 'string' ? getSpacingValue(px) : px
    if (py) styles.paddingTop = styles.paddingBottom = typeof py === 'string' ? getSpacingValue(py) : py
    if (pt) styles.paddingTop = typeof pt === 'string' ? getSpacingValue(pt) : pt
    if (pr) styles.paddingRight = typeof pr === 'string' ? getSpacingValue(pr) : pr
    if (pb) styles.paddingBottom = typeof pb === 'string' ? getSpacingValue(pb) : pb
    if (pl) styles.paddingLeft = typeof pl === 'string' ? getSpacingValue(pl) : pl

    if (m) styles.margin = typeof m === 'string' ? getSpacingValue(m) : m
    if (mx) styles.marginLeft = styles.marginRight = typeof mx === 'string' ? getSpacingValue(mx) : mx
    if (my) styles.marginTop = styles.marginBottom = typeof my === 'string' ? getSpacingValue(my) : my
    if (mt) styles.marginTop = typeof mt === 'string' ? getSpacingValue(mt) : mt
    if (mr) styles.marginRight = typeof mr === 'string' ? getSpacingValue(mr) : mr
    if (mb) styles.marginBottom = typeof mb === 'string' ? getSpacingValue(mb) : mb
    if (ml) styles.marginLeft = typeof ml === 'string' ? getSpacingValue(ml) : ml

    // Layout
    if (w !== undefined) styles.width = typeof w === 'string' ? w : w
    if (h !== undefined) styles.height = typeof h === 'string' ? h : h
    if (minW !== undefined) styles.minWidth = typeof minW === 'string' ? minW : minW
    if (minH !== undefined) styles.minHeight = typeof minH === 'string' ? minH : minH
    if (maxW !== undefined) styles.maxWidth = typeof maxW === 'string' ? maxW : maxW
    if (maxH !== undefined) styles.maxHeight = typeof maxH === 'string' ? maxH : maxH

    // Flexbox
    if (flex !== undefined) {
      if (typeof flex === 'boolean') {
        styles.display = 'flex'
      } else {
        styles.flex = flex
      }
    }
    if (direction) {
      styles.flexDirection = direction
      if (!styles.display) styles.display = 'flex'
    }
    if (align) {
      const alignMap = {
        start: 'flex-start',
        end: 'flex-end',
        center: 'center',
        stretch: 'stretch',
        baseline: 'baseline'
      }
      styles.alignItems = alignMap[align]
      if (!styles.display) styles.display = 'flex'
    }
    if (justify) {
      const justifyMap = {
        start: 'flex-start',
        end: 'flex-end',
        center: 'center',
        between: 'space-between',
        around: 'space-around',
        evenly: 'space-evenly'
      }
      styles.justifyContent = justifyMap[justify]
      if (!styles.display) styles.display = 'flex'
    }
    if (wrap !== undefined) {
      styles.flexWrap = typeof wrap === 'boolean' ? (wrap ? 'wrap' : 'nowrap') : wrap
      if (!styles.display) styles.display = 'flex'
    }
    if (gap) styles.gap = getSpacingValue(gap)

    // Colors
    if (bg) styles.backgroundColor = getColorValue(bg)
    if (color) styles.color = getColorValue(color)
    if (borderColor) styles.borderColor = getColorValue(borderColor)

    // Typography
    if (fontSize) styles.fontSize = getFontSize(fontSize)
    if (fontWeight) styles.fontWeight = getFontWeight(fontWeight)
    if (lineHeight) styles.lineHeight = getLineHeight(lineHeight)
    if (textAlign) styles.textAlign = textAlign

    // Border
    if (border !== undefined) {
      if (typeof border === 'boolean') {
        styles.border = '1px solid'
      } else {
        styles.border = border
      }
    }
    if (borderWidth) styles.borderWidth = borderWidth
    if (borderRadius) styles.borderRadius = getBorderRadius(borderRadius)

    // Shadow
    if (shadow) styles.boxShadow = getShadow(shadow)

    // Position
    if (position) styles.position = position
    if (top !== undefined) styles.top = top
    if (right !== undefined) styles.right = right
    if (bottom !== undefined) styles.bottom = bottom
    if (left !== undefined) styles.left = left
    if (zIndex) styles.zIndex = getZIndex(zIndex)

    // Display
    if (display) styles.display = display

    // Overflow
    if (overflow) styles.overflow = overflow
    if (overflowX) styles.overflowX = overflowX
    if (overflowY) styles.overflowY = overflowY

    return React.createElement(element, {
      ...restProps,
      style: {
        ...styles,
        ...restProps.style,
      },
    })
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const Box = styled('div')
export const Flex = styled('div')
export const Text = styled('span')
export const Heading = styled('h1')
export const Button = styled('button')
export const Input = styled('input')
export const TextArea = styled('textarea')
export const Image = styled('img')
export const Link = styled('a')

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getDesignToken = (path: string) => {
  const keys = path.split('.')
  let value: any = designTokens
  
  for (const key of keys) {
    value = value[key]
    if (value === undefined) {
      console.warn(`Design token not found: ${path}`)
      return undefined
    }
  }
  
  return value
}

export const createVariant = <T extends Record<string, any>>(variants: T) => {
  return variants
}

// ============================================================================
// RE-EXPORT DESIGN TOKENS
// ============================================================================

export { designTokens }
export type { DesignTokens }
