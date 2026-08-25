const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

function kebabCase(str) {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function processFile(filePath, prefix) {
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (err) {
    console.error(`Error parsing ${filePath}:`, err);
    return;
  }

  let cssOutput = '';
  let counter = 1;

  traverse(ast, {
    JSXAttribute(pathNode) {
      if (pathNode.node.name.name === 'style') {
        const value = pathNode.node.value;
        if (t.isJSXExpressionContainer(value)) {
          const expr = value.expression;

          let objExpr = null;
          let isTypeCast = false;

          if (t.isObjectExpression(expr)) {
            objExpr = expr;
          } else if (t.isTSAsExpression(expr) && t.isObjectExpression(expr.expression)) {
            objExpr = expr.expression;
            isTypeCast = true;
          }

          if (objExpr) {
            // Check if all properties are static
            let isStatic = true;
            let cssRules = [];
            for (const prop of objExpr.properties) {
              if (t.isObjectProperty(prop)) {
                let key = prop.key.name || prop.key.value;
                if (!key) {
                  isStatic = false;
                  break;
                }
                
                let val;
                if (t.isStringLiteral(prop.value)) {
                  val = prop.value.value;
                } else if (t.isNumericLiteral(prop.value)) {
                  val = prop.value.value;
                  // add px to numbers if needed, but react-native-web handles numbers mostly.
                  // For CSS, we usually need px for non-zero numbers unless it's flex, opacity, etc.
                  const noPxProps = new Set(['flex', 'opacity', 'zIndex', 'fontWeight', 'lineHeight']);
                  if (val !== 0 && !noPxProps.has(key)) {
                    val = val + 'px';
                  }
                } else {
                  // Complex value like variables, template literals
                  isStatic = false;
                  break;
                }
                cssRules.push(`  ${kebabCase(key)}: ${val};`);
              } else {
                isStatic = false;
                break;
              }
            }

            if (isStatic && cssRules.length > 0) {
              const className = `${prefix}-${counter++}`;
              cssOutput += `.${className} {\n${cssRules.join('\n')}\n}\n`;

              // Now replace the style attribute with a className attribute.
              // We need to merge with existing className if any, but for simplicity:
              // Find existing className
              const openingElement = pathNode.parentPath.node;
              let existingClassNameIndex = openingElement.attributes.findIndex(
                attr => attr.name && attr.name.name === 'className'
              );

              if (existingClassNameIndex !== -1) {
                const existingAttr = openingElement.attributes[existingClassNameIndex];
                if (t.isStringLiteral(existingAttr.value)) {
                  existingAttr.value.value += ` ${className}`;
                } else if (t.isJSXExpressionContainer(existingAttr.value)) {
                  // If it's something like className={clsx(...)}, too complex, just skip or add class manually.
                  // Let's just create a template literal
                  const oldExpr = existingAttr.value.expression;
                  if (t.isStringLiteral(oldExpr)) {
                    oldExpr.value += ` ${className}`;
                  } else {
                    existingAttr.value.expression = t.binaryExpression('+', oldExpr, t.stringLiteral(` ${className}`));
                  }
                }
              } else {
                openingElement.attributes.push(
                  t.jsxAttribute(
                    t.jsxIdentifier('className'),
                    t.stringLiteral(className)
                  )
                );
              }

              // Remove the style attribute
              pathNode.remove();
            }
          }
        }
      }
    }
  });

  if (counter > 1) {
    const { code: newCode } = generator(ast, { retainLines: false });
    fs.writeFileSync(filePath, newCode, 'utf8');
    fs.appendFileSync(path.join(__dirname, '../frontend/src/nexus-glow-styles.css'), `\n/* Extracted from ${path.basename(filePath)} */\n${cssOutput}`);
    console.log(`Extracted ${counter - 1} styles from ${filePath}`);
  } else {
    console.log(`No static styles found to extract in ${filePath}`);
  }
}

processFile(path.join(__dirname, '../frontend/app/(auth)/login.tsx'), 'au-st');
processFile(path.join(__dirname, '../frontend/src/views/web/OnboardingShellRN.tsx'), 'ob-st');

