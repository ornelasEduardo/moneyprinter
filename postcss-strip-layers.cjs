module.exports = () => ({
  postcssPlugin: 'strip-layers',
  AtRule: {
    layer(atRule) {
      if (atRule.nodes) {
        atRule.replaceWith(atRule.nodes);
      } else {
        atRule.remove();
      }
    },
  },
});
module.exports.postcss = true;
