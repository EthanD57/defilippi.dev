import React from 'react';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

interface FileTreeProps {
    items: any[];
    onFileClick: (file: any) => void;
    selectedFile: string | null;
    depth?: number; // Tracks how far to indent
}

const FileTree: React.FC<FileTreeProps> = ({ items, onFileClick, selectedFile, depth = 0 }) => {
    return (
        <ul className="space-y-1">
            {items.map((item) => (
                <li key={item.name} style={{ paddingLeft: `${depth * 12}px` }}>
                    {item.type === 'folder' ? (
                        <div>
                            <div className="flex items-center gap-2 p-2 text-gray-400 text-[11px] font-bold uppercase tracking-widest">
                                <span>📁</span> {item.name}
                            </div>
                            {/* This is the Recursion: The component calls itself for the children */}
                            <FileTree
                                items={item.children}
                                onFileClick={onFileClick}
                                selectedFile={selectedFile}
                                depth={depth + 1}
                            />
                        </div>
                    ) : (
                        <div
                            onClick={() => onFileClick(item)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm font-medium transition-colors w-min ${
                                selectedFile === item.name
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                        >
                            <span><FontAwesomeIcon icon={item.icon} /></span>{item.name}
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
};

export default FileTree;