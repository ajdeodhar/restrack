'use client';

import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

interface TexEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const stexLanguage = StreamLanguage.define(stex);

export default function TexEditor({ value, onChange, className = '' }: TexEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={[stexLanguage]}
      theme={vscodeDark}
      height="100%"
      className={`text-xs font-mono overflow-auto ${className}`}
      basicSetup={{ lineNumbers: true, foldGutter: true }}
    />
  );
}
