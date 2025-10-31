
import React, { useEffect, useState } from 'react';

interface SlashCommandItem {
    title: string;
    description: string;
    icon: string;
    action: () => void;
}

interface SlashCommandListProps {
    items: SlashCommandItem[];
    onSelect: (item: SlashCommandItem) => void;
    editor: any;
}

const SlashCommandList: React.FC<SlashCommandListProps> = ({ items, onSelect, editor }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
                return;
            }

            if (event.key === 'ArrowDown') {
                setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                onSelect(items[selectedIndex]);
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [items, selectedIndex, onSelect]);


console.log("props", items);

    return (
        <div className="slash-command-list">
            <h3>可用命令</h3>
            {items.map((item, index) => (
                <div
                    key={index}
                    className={`slash-command-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => onSelect(item)}
                >
                    <span className="slash-command-icon">{item.icon}</span>
                    <div className="slash-command-content">
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SlashCommandList;
