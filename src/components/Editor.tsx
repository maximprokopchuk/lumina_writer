import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Type,
  Quote
} from 'lucide-react';
import { cn } from '../utils/lib';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function Editor({ content, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Начните писать свою историю...',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[70vh] font-serif leading-relaxed',
      },
    },
  });

  // Update editor content when the chapter changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const toggleDirectSpeech = () => {
    // Russian direct speech format: starts with an em-dash and a space
    editor.chain().focus().insertContent('— ').run();
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-stone-200 flex flex-col">
      {/* Editor Toolbar */}
      <div className="flex items-center flex-wrap gap-1 p-2 border-b border-stone-100 bg-stone-50/50 rounded-t-lg">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-2 rounded hover:bg-stone-200 transition-colors",
            editor.isActive('bold') && "bg-stone-200 text-stone-900"
          )}
          title="Жирный (Ctrl+B)"
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-2 rounded hover:bg-stone-200 transition-colors",
            editor.isActive('italic') && "bg-stone-200 text-stone-900"
          )}
          title="Курсив (Ctrl+I)"
        >
          <Italic size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "p-2 rounded hover:bg-stone-200 transition-colors",
            editor.isActive('underline') && "bg-stone-200 text-stone-900"
          )}
          title="Подчеркнутый (Ctrl+U)"
        >
          <UnderlineIcon size={18} />
        </button>

        <div className="w-px h-6 bg-stone-200 mx-1" />

        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn(
            "p-2 rounded hover:bg-stone-200 transition-colors",
            editor.isActive({ textAlign: 'left' }) && "bg-stone-200 text-stone-900"
          )}
          title="По левому краю"
        >
          <AlignLeft size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn(
            "p-2 rounded hover:bg-stone-200 transition-colors",
            editor.isActive({ textAlign: 'center' }) && "bg-stone-200 text-stone-900"
          )}
          title="По центру"
        >
          <AlignCenter size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn(
            "p-2 rounded hover:bg-stone-200 transition-colors",
            editor.isActive({ textAlign: 'right' }) && "bg-stone-200 text-stone-900"
          )}
          title="По правому краю"
        >
          <AlignRight size={18} />
        </button>

        <div className="w-px h-6 bg-stone-200 mx-1" />

        <button
          onClick={toggleDirectSpeech}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-stone-200 transition-colors text-sm font-medium text-stone-600"
          title="Прямая речь (Тире)"
        >
          <Quote size={16} />
          <span>Прямая речь</span>
        </button>
      </div>

      <div className="p-8 md:p-12">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
