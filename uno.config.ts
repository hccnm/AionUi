import { defineConfig, presetMini, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss';
import { presetExtra } from 'unocss-preset-extra';

const textColors = {
  't-primary': 'var(--text-primary)',
  't-secondary': 'var(--text-secondary)',
  't-tertiary': 'var(--bg-6)',
  't-disabled': 'var(--text-disabled)',
};

const semanticColors = {
  primary: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

const backgroundColors = {
  base: 'var(--bg-base)',
  1: 'var(--bg-1)',
  2: 'var(--bg-2)',
  3: 'var(--bg-3)',
  4: 'var(--bg-4)',
  5: 'var(--bg-5)',
  6: 'var(--bg-6)',
  8: 'var(--bg-8)',
  9: 'var(--bg-9)',
  10: 'var(--bg-10)',
  hover: 'var(--bg-hover)',
  active: 'var(--bg-active)',
};

const borderColors = {
  'b-base': 'var(--border-base)',
  'b-light': 'var(--border-light)',
  'b-1': 'var(--bg-3)',
  'b-2': 'var(--bg-4)',
  'b-3': 'var(--bg-5)',
};

const brandColors = {
  brand: 'var(--brand)',
  'brand-light': 'var(--brand-light)',
  'brand-hover': 'var(--brand-hover)',
};

const aouColors = {
  aou: {
    1: 'var(--aou-1)',
    2: 'var(--aou-2)',
    3: 'var(--aou-3)',
    4: 'var(--aou-4)',
    5: 'var(--aou-5)',
    6: 'var(--aou-6)',
    7: 'var(--aou-7)',
    8: 'var(--aou-8)',
    9: 'var(--aou-9)',
    10: 'var(--aou-10)',
  },
};

const componentColors = {
  'message-user': 'var(--message-user-bg)',
  'message-tips': 'var(--message-tips-bg)',
  'workspace-btn': 'var(--workspace-btn-bg)',
};

const specialColors = {
  fill: 'var(--fill)',
  inverse: 'var(--inverse)',
};

export default defineConfig({
  presets: [presetMini(), presetExtra(), presetWind3()],
  transformers: [transformerVariantGroup(), transformerDirectives({ enforce: 'pre' })],
  content: {
    pipeline: {
      include: [/\.[jt]sx?($|\?)/, /\.vue($|\?)/, /\.css($|\?)/],
      exclude: [/[\\/]node_modules[\\/]/, /\.html($|\?)/],
    },
  },
  rules: [
    [/^text-([1-4])$/, ([, d]: RegExpExecArray) => ({ color: `var(--color-text-${d})` })],
    [/^bg-fill-([1-4])$/, ([, d]: RegExpExecArray) => ({ 'background-color': `var(--color-fill-${d})` })],
    [/^border-arco-([1-4])$/, ([, d]: RegExpExecArray) => ({ 'border-color': `var(--color-border-${d})` })],
    [
      /^bg-(primary|success|warning|danger|link)-light-([1-4])$/,
      ([, color, d]: RegExpExecArray) => ({ 'background-color': `var(--color-${color}-light-${d})` }),
    ],
    [
      /^(bg|text|border)-(primary|success|warning|danger)-([1-9])$/,
      ([, prefix, color, d]: RegExpExecArray) => {
        const prop = prefix === 'bg' ? 'background-color' : prefix === 'text' ? 'color' : 'border-color';
        return { [prop]: `rgb(var(--${color}-${d}))` };
      },
    ],
    ['bg-color-white', { 'background-color': 'var(--color-white)' }],
    ['text-color-white', { color: 'var(--color-white)' }],
    ['bg-color-black', { 'background-color': 'var(--color-black)' }],
    ['text-color-black', { color: 'var(--color-black)' }],
    ['bg-popup', { 'background-color': 'var(--color-bg-popup)' }],
    ['bg-dialog-fill-0', { 'background-color': 'var(--dialog-fill-0)' }],
    ['text-0', { color: 'var(--text-0)' }],
    ['text-white', { color: 'var(--text-white)' }],
    ['bg-fill-0', { 'background-color': 'var(--fill-0)' }],
    ['bg-fill-white-to-black', { 'background-color': 'var(--fill-white-to-black)' }],
    ['border-special', { 'border-color': 'var(--border-special)' }],
    ['animate-wiggle', { animation: 'wiggle 3s ease-in-out infinite' }],
  ],
  preflights: [
    {
      getCSS: () => `
        * {
          color: inherit;
        }
        @keyframes wiggle {
          0%, 20%, 100% { transform: rotate(0deg); }
          4% { transform: rotate(8deg); }
          8% { transform: rotate(-8deg); }
          12% { transform: rotate(6deg); }
          16% { transform: rotate(-4deg); }
        }
      `,
    },
  ],
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
  },
  theme: {
    colors: {
      ...textColors,
      ...semanticColors,
      ...backgroundColors,
      ...borderColors,
      ...brandColors,
      ...aouColors,
      ...componentColors,
      ...specialColors,
    },
    fontFamily: {
      mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, "Cascadia Code", "Roboto Mono", Consolas, "Liberation Mono", monospace',
    },
  },
});
