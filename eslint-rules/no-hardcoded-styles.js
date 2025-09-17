/**
 * ESLint rule to prevent hard-coded hex colors and pixel radii in UI components
 * Enforces the use of design tokens instead of magic values
 */

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hard-coded hex colors and pixel radii in favor of design tokens',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        allowedFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'File patterns where hard-coded styles are allowed (e.g., theme files)'
        },
        allowedColors: {
          type: 'array', 
          items: { type: 'string' },
          description: 'Specific hex colors that are allowed (e.g., #ffffff, #000000)'
        }
      },
      additionalProperties: false
    }]
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedFiles = options.allowedFiles || [
      '**/theme.css',
      '**/global.css',
      '**/styles/theme.*',
      '**/tailwind.config.*'
    ];
    const allowedColors = options.allowedColors || ['#ffffff', '#000000', 'transparent'];
    
    const filename = context.getFilename();
    
    // Skip check if file is in allowed list
    const isAllowedFile = allowedFiles.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
      }
      return filename.includes(pattern);
    });
    
    if (isAllowedFile) {
      return {};
    }

    // Regex patterns for detection
    const hexColorPattern = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
    const pxRadiusPattern = /(?:border-radius|rounded-)\s*:?\s*(\d+px|px-\d+)/gi;
    const hardcodedRadiusPattern = /(?:rounded-(?:sm|md|lg|xl|2xl|3xl|full)|\d+px)/g;

    function checkStringForViolations(node, value) {
      const violations = [];
      
      // Check for hex colors
      let match;
      while ((match = hexColorPattern.exec(value)) !== null) {
        const hexColor = match[0].toLowerCase();
        if (!allowedColors.includes(hexColor)) {
          violations.push({
            type: 'hex-color',
            value: match[0],
            index: match.index,
            message: `Hard-coded hex color "${match[0]}" found. Use design tokens like "var(--ui-primary)" instead.`
          });
        }
      }
      
      // Check for pixel radii (but allow design token references)
      const pxRadiusMatches = value.match(pxRadiusPattern);
      if (pxRadiusMatches) {
        pxRadiusMatches.forEach(match => {
          // Allow if it's using CSS custom properties
          if (!value.includes('var(--r-') && !value.includes('rounded-[var(--r-')) {
            violations.push({
              type: 'px-radius',
              value: match,
              message: `Hard-coded pixel radius "${match}" found. Use design tokens like "var(--r-md)" or "rounded-[var(--r-md)]" instead.`
            });
          }
        });
      }
      
      return violations;
    }

    function reportViolations(node, violations, textValue) {
      violations.forEach(violation => {
        context.report({
          node,
          message: violation.message,
          data: { value: violation.value },
          fix(fixer) {
            // Provide suggested fixes for common patterns
            if (violation.type === 'hex-color') {
              const suggestions = {
                '#ffffff': 'var(--ui-bg)',
                '#fff': 'var(--ui-bg)', 
                '#000000': 'var(--ui-text)',
                '#000': 'var(--ui-text)',
                '#f3f4f6': 'var(--ui-subtle)',
                '#e5e7eb': 'var(--ui-border)',
                '#3b82f6': 'var(--ui-primary)',
                '#ef4444': 'var(--ui-danger)',
              };
              
              const suggestion = suggestions[violation.value.toLowerCase()];
              if (suggestion && node.type === 'Literal') {
                return fixer.replaceText(node, `"${textValue.replace(violation.value, suggestion)}"`);
              }
            }
            
            if (violation.type === 'px-radius') {
              const radiusMap = {
                '4px': 'var(--r-sm)',
                '6px': 'var(--r-md)', 
                '8px': 'var(--r-md)',
                '12px': 'var(--r-lg)',
                '16px': 'var(--r-xl)',
                '9999px': 'var(--r-full)',
              };
              
              // Extract pixel value
              const pxMatch = violation.value.match(/(\d+)px/);
              if (pxMatch && node.type === 'Literal') {
                const suggestion = radiusMap[pxMatch[0]] || 'var(--r-md)';
                return fixer.replaceText(node, `"${textValue.replace(violation.value, suggestion)}"`);
              }
            }
            
            return null;
          }
        });
      });
    }

    return {
      // Check string literals
      Literal(node) {
        if (typeof node.value === 'string') {
          const violations = checkStringForViolations(node, node.value);
          if (violations.length > 0) {
            reportViolations(node, violations, node.value);
          }
        }
      },

      // Check template literals
      TemplateLiteral(node) {
        node.quasis.forEach(quasi => {
          if (quasi.value && quasi.value.raw) {
            const violations = checkStringForViolations(quasi, quasi.value.raw);
            if (violations.length > 0) {
              reportViolations(node, violations, quasi.value.raw);
            }
          }
        });
      },

      // Check JSX attribute values
      JSXAttribute(node) {
        if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
          const violations = checkStringForViolations(node.value, node.value.value);
          if (violations.length > 0) {
            reportViolations(node.value, violations, node.value.value);
          }
        }
      },
    };
  }
};

export { rule };