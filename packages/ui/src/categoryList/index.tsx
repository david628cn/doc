import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Tooltip } from '../popuover';
import { SearchInput } from '../searchInput';
import { CLASSNAME } from '../config';
import './index.less';

export type CategoryListProps = {
    data?: any[];
    className?: string;
    /** External filter key. If provided, it takes precedence over internal debounce logic. */
    searchKey?: string;
    /** Search input (controlled). */
    searchValue?: string;
    /** Search input initial value (uncontrolled). */
    defaultSearchValue?: string;
    /** Search input placeholder. */
    searchPlaceholder?: string;
    /** Show/hide built-in search input. */
    showSearch?: boolean;
    /** Debounced callback (after timeout). */
    onSearch?: (value: string) => void;
    renderItem?: (a: any, b: any) => React.ReactNode;
    onChange?: (a: any, b: any, e: any) => void;
    style?: React.CSSProperties;
}

export const CategoryList: React.FC<CategoryListProps> = props => {
    const {
        className,
        data = [],
        searchKey,
        searchValue,
        defaultSearchValue,
        searchPlaceholder = '搜索...',
        showSearch = true,
        renderItem,
        onChange,
        onSearch,
        style
    } = props;
    // const [open, setOpen] = useState(false);
    // const [currentTone, setCurrentTone] = useState('default');

    // const [activeKey, setActiveKey] = useState(data[0]?.key);
    const [activeTab, setActiveTab] = useState(data[0]?.key);

    const scrollRef = useRef<HTMLDivElement>(null);
    const labelRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const isSearchControlled = searchValue !== undefined;
    const [innerSearchValue, setInnerSearchValue] = useState(defaultSearchValue ?? '');
  

    useEffect(() => {
        if (isSearchControlled) setInnerSearchValue(searchValue ?? '');
    }, [isSearchControlled, searchValue]);

    const effectiveSearchKey = (searchKey ?? innerSearchValue).trim().toLowerCase();

    // 【核心过滤逻辑】
    const filteredData = useMemo(() => {
        const target = effectiveSearchKey;
        if (!target) return data;

        return data.map(cat => {
            const children = cat.children?.filter((item: any) =>
                item.name?.toLowerCase().includes(target) ||
                item.keywords?.some((k: string) => k.toLowerCase().includes(target))
            );
            return { ...cat, children };
        }).filter(cat => cat.children && cat.children.length > 0);
    }, [data, effectiveSearchKey]);

    useEffect(() => {
        if (!scrollRef.current) return;

        const observerOptions = {
            root: scrollRef.current, // 以中间滚动区域为容器
            // 判定线设在顶部：顶部 0，底部收缩到 -90% 以上
            rootMargin: '-1px 0px -99% 0px',
            threshold: 0,
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                // 当分类标题进入顶部判定区
                if (entry.isIntersecting) {
                    const key = entry.target.getAttribute('data-id');
                    if (key) setActiveTab(key);
                }
            });
        }, observerOptions);

        // 监听所有的分类 Label
        const targets = scrollRef.current.querySelectorAll(`.${CLASSNAME}-category-list-panel-label`);
        targets.forEach((target) => observer.observe(target));

        return () => observer.disconnect();
    }, [filteredData]);

    const scrollToCategory = (key: string) => {
        const element = labelRefs.current[key];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveTab(key);
        }
    };

    const handleSelect = (item: any, cat: any) => {
        return (e: any) => {
            onChange?.(item, cat, e)
        }
    }

    const cls = [`${CLASSNAME}-category-list`];

    if (className) {
        cls.push(className);
    }

    return (
        <div className={cls.join(' ')}>
            <div className={`${CLASSNAME}-category-list-header`}>
                {showSearch && (
                    <div className={`${CLASSNAME}-category-list-search`}>
                        <SearchInput
                            placeholder={searchPlaceholder}
                            onSearch={(v: string) => {
                                if (!isSearchControlled) setInnerSearchValue(v);
                                onSearch?.(v);
                            }}
                        ></SearchInput>
                    </div>
                )}
            </div>
            <div className={`${CLASSNAME}-category-list-center`} ref={scrollRef} style={style}>
                {filteredData.map(cat => (
                    <div key={cat.key} className={`${CLASSNAME}-category-list-panel`}>
                        {/* <div 
                            data-id={cat.key} 
                            ref={el => labelRefs.current[cat.key] = el}
                            style={{ height: '1px', marginBottom: '-1px' }} 
                        ></div> */}
                        <div
                            className={`${CLASSNAME}-category-list-panel-label`}
                            data-id={cat.key}
                            ref={el => labelRefs.current[cat.key] = el}
                        >{cat.label}</div>
                        <div className={`${CLASSNAME}-category-list-panel-list`}>
                            {cat.children?.map((item: any, idx: number) => {
                                // 关键：传入当前分类的 key 和选中的修饰符
                                // const displayEmoji = getFinalEmoji(item, cat.key);
                                const content = (
                                    <div
                                        key={item.key}
                                        className={`${CLASSNAME}-category-list-panel-item`}
                                        // title={item.title}
                                        onClick={handleSelect(item, cat)}
                                    >
                                        <span className={`${CLASSNAME}-category-list-panel-item-icon`}>
                                            {/* {displayEmoji} */}
                                            {renderItem ? renderItem?.(item, cat) : item?.label}
                                        </span>
                                    </div>
                                );
                                if (item.title) {
                                    return <Tooltip key={idx} title={item.title} >{content}</Tooltip>
                                }
                                return content;
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <div className={`${CLASSNAME}-category-list-footer`}>
                <div className={`${CLASSNAME}-category-list-panel-list`}>
                    {
                        data.map(cat => {
                            const c = [`${CLASSNAME}-category-list-panel-item`];
                            if (cat.key === activeTab) {
                                c.push(`${CLASSNAME}-category-list-active`);
                            }
                            return (
                                <div key={cat.key} className={c.join(' ')} title={cat.title} onClick={() => scrollToCategory(cat.key)}>
                                    <span className={`${CLASSNAME}-category-list-panel-item-icon`}>{cat.icon}</span>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    );
};