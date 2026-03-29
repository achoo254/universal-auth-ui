import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const external = [
  'firebase/app',
  'firebase/auth',
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.mjs',
        format: 'es',
        sourcemap: true,
      },
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'UniversalAuthUI',
        sourcemap: true,
        globals: {
          'firebase/app': 'firebase.app',
          'firebase/auth': 'firebase.auth',
        },
      },
    ],
    external,
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
    ],
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    external,
    plugins: [dts()],
  },
];
