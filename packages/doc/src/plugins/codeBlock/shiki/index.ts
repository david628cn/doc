import { createHighlightPlugin, withLineNumbers } from 'prosemirror-highlight';
import { createParser } from 'prosemirror-highlight/shiki';
import { getSingletonHighlighter } from 'shiki';
import './index.less';
import { EditorView } from 'prosemirror-view';

// export const LANGS: any[] = ['javascript', 'typescript', 'jsx', 'tsx', 'css', 'less',, 'scss', 'sass', 'python', 'json', 'css', 'html', 'java', 'c', 'cpp', 'go', 'ruby', 'php', 'rust', 'kotlin', 'swift', 'bash', 'yaml', 'markdown'];
// export const LANGS: any[] = [
//     '1c', '1c-query', 'abap', 'actionscript-3', 'ada', 'adoc', 'angular-html', 'angular-ts', 'apache', 'apex',
//     'apl', 'applescript', 'ara', 'asciidoc', 'asm', 'astro', 'awk', 'ballerina', 'bash', 'bat', 'batch', 'be',
//     'beancount', 'berry', 'bibtex', 'bicep', 'bird', 'bird2', 'blade', 'bsl', 'c', 'c#', 'c++', 'c3', 'cadence',
//     'cairo', 'cdc', 'cjs', 'clarity', 'clj', 'clojure', 'closure-templates', 'cmake', 'cmd', 'cobol', 'codeowners',
//     'codeql', 'coffee', 'coffeescript', 'common-lisp', 'console', 'coq', 'cpp', 'cql', 'crystal', 'cs', 'csharp',
//     'css', 'csv', 'cts', 'cue', 'cypher', 'd', 'dart', 'dax', 'desktop', 'diff', 'docker', 'dockerfile', 'dotenv',
//     'dream-maker', 'edge', 'elisp', 'elixir', 'elm', 'emacs-lisp', 'erb', 'erl', 'erlang', 'f', 'f#', 'f03', 'f08',
//     'f18', 'f77', 'f90', 'f95', 'fennel', 'fish', 'fluent', 'for', 'fortran-fixed-form', 'fortran-free-form', 'fs',
//     'fsharp', 'fsl', 'ftl', 'gd', 'gdresource', 'gdscript', 'gdshader', 'genie', 'gherkin', 'git-commit',
//     'git-rebase', 'gjs', 'gleam', 'glimmer-js', 'glimmer-ts', 'glsl', 'gn', 'gnuplot', 'go', 'gql', 'graphql',
//     'groovy', 'gts', 'hack', 'haml', 'handlebars', 'haskell', 'haxe', 'hbs', 'hcl', 'hjson', 'hlsl', 'hs', 'html',
//     'html-derivative', 'http', 'hurl', 'hxml', 'hy', 'imba', 'ini', 'jade', 'java', 'javascript', 'jinja', 'jison',
//     'jl', 'js', 'json', 'json5', 'jsonc', 'jsonl', 'jsonnet', 'jssm', 'jsx', 'julia', 'just', 'kdl', 'kotlin',
//     'kql', 'kt', 'kts', 'kusto', 'latex', 'lean', 'lean4', 'less', 'liquid', 'lisp', 'lit', 'llvm', 'log', 'logo',
//     'lua', 'luau', 'make', 'makefile', 'markdown', 'marko', 'matlab', 'mbt', 'mbti', 'md', 'mdc', 'mdx', 'mediawiki',
//     'mermaid', 'mips', 'mipsasm', 'mjs', 'mmd', 'mojo', 'moonbit', 'move', 'mts', 'nar', 'narrat', 'nextflow',
//     'nextflow-groovy', 'nf', 'nginx', 'nim', 'nix', 'nu', 'nushell', 'objc', 'objective-c', 'objective-cpp',
//     'ocaml', 'odin', 'openscad', 'pascal', 'perl', 'perl6', 'php', 'pkl', 'plsql', 'po', 'polar', 'postcss', 'pot',
//     'potx', 'powerquery', 'powershell', 'prisma', 'prolog', 'properties', 'proto', 'protobuf', 'ps', 'ps1', 'pug',
//     'puppet', 'purescript', 'py', 'python', 'ql', 'qml', 'qmldir', 'qss', 'r', 'racket', 'raku', 'razor', 'rb',
//     'reg', 'regex', 'regexp', 'rel', 'riscv', 'ron', 'rosmsg', 'rs', 'rst', 'ruby', 'rust', 'sas', 'sass', 'scad',
//     'scala', 'scheme', 'scss', 'sdbl', 'sh', 'shader', 'shaderlab', 'shell', 'shellscript', 'shellsession',
//     'smalltalk', 'solidity', 'soy', 'sparql', 'spl', 'splunk', 'sql', 'ssh-config', 'stata', 'styl', 'stylus',
//     'surql', 'surrealql', 'svelte', 'swift', 'system-verilog', 'systemd', 'talon', 'talonscript', 'tasl', 'tcl',
//     'templ', 'terraform', 'tex', 'tf', 'tfvars', 'toml', 'tres', 'ts', 'ts-tags', 'tscn', 'tsp', 'tsv', 'tsx',
//     'turtle', 'twig', 'typ', 'typescript', 'typespec', 'typst', 'v', 'vala', 'vb', 'verilog', 'vhdl', 'vim', 'viml',
//     'vimscript', 'vue', 'vue-html', 'vue-vine', 'vy', 'vyper', 'wasm', 'wenyan', 'wgsl', 'wiki', 'wikitext', 'wit',
//     'wl', 'wolfram', 'xml', 'xsl', 'yaml', 'yml', 'zenscript', 'zig', 'zsh'
// ];

export const LANGS = [
    'javascript', 'typescript', 'jsx', 'tsx', 'css', 'less', 'scss', 'html', 
    'python', 'json', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'sql', 
    'bash', 'yaml', 'markdown', 'plaintext'
];

const highlighter: any = await getSingletonHighlighter({
    themes: ['ayu-light'],
  
    langs: LANGS,
});
const parser = withLineNumbers(createParser(highlighter));
// const parser = createParser(highlighter);

export const shiki = createHighlightPlugin({
    parser,
    // 核心配置：插件会自动读取 node.attrs.language 并交给 Shiki 解析
    nodeToLanguage: (node: any) => {
        return node.attrs.language || LANGS[0];
    }
} as any);

// UI 交互：在协作文档中，通常会点击代码块右上角的 Select 框。修改语言时，使用 setNodeMarkup 命令：
const setLanguage = (view: EditorView, pos: number, lang: string) => {
    view.dispatch(
        view.state.tr.setNodeMarkup(pos, null, { language: lang })
    )
}

// 如果需要动态加载新语言：
export const changeLangAndEnsureLoaded = async (view: EditorView, pos: number, lang: string) => {
    if (!highlighter.getLoadedLanguages().includes(lang)) {
        await highlighter.loadLanguage(lang);
    }
    setLanguage(view, pos, lang);
}