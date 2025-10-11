/**
 * ESLint rule to prevent hardcoded colors and ad-hoc box-shadow values
 * Ensures design tokens are used consistently
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prevent hardcoded color values and ad-hoc box-shadow values',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      hardcodedColor: 'Avoid hardcoded color values. Use design tokens instead.',
      hardcodedShadow: 'Avoid ad-hoc box-shadow values. Use design tokens instead.',
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode()

    // Common hardcoded color patterns
    const colorPatterns = [
      /#[0-9a-fA-F]{3,6}/, // Hex colors
      /rgb\(/,
      /rgba\(/,
      /hsl\(/,
      /hsla\(/,
      /'#[0-9a-fA-F]{3,6}'/,
      /"#[0-9a-fA-F]{3,6}"/,
    ]

    // Common hardcoded shadow patterns
    const shadowPatterns = [
      /box-shadow:\s*[^;]+;/,
      /shadow:\s*[^;]+;/,
    ]

    function checkForHardcodedValues(node) {
      const text = sourceCode.getText(node)

      // Check for hardcoded colors
      colorPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          context.report({
            node,
            messageId: 'hardcodedColor',
          })
        }
      })

      // Check for hardcoded shadows
      shadowPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          context.report({
            node,
            messageId: 'hardcodedShadow',
          })
        }
      })
    }

    return {
      // Check style objects in JSX
      JSXAttribute(node) {
        if (node.name.name === 'style' && node.value.type === 'JSXExpressionContainer') {
          checkForHardcodedValues(node.value.expression)
        }
      },

      // Check style properties in object literals
      Property(node) {
        if (node.key && (
          node.key.name === 'backgroundColor' ||
          node.key.name === 'color' ||
          node.key.name === 'borderColor' ||
          node.key.name === 'boxShadow' ||
          node.key.name === 'shadow'
        )) {
          checkForHardcodedValues(node.value)
        }
      },

      // Check template literals that might contain CSS
      TemplateLiteral(node) {
        const text = sourceCode.getText(node)
        if (text.includes('style=') || text.includes('className=')) {
          checkForHardcodedValues(node)
        }
      },
    }
  },
}
