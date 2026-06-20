import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import type { Category } from '@mercury/shared';
import { PlusIcon } from '@/components/icons';
import styles from './CategorySelect.module.css';

interface CategorySelectProps {
  categories: Category[];
  type: 'income' | 'expense';
  value: string | null;
  onChange: (categoryId: string) => void;
  onCreateCategory: (name: string, type: 'income' | 'expense', color?: string) => Promise<Category>;
  disabled?: boolean;
}

const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#AA96DA',
  '#FCBAD3', '#2ECC71', '#3498DB', '#9B59B6', '#F39C12',
];

function randomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export function CategorySelect({
  categories,
  type,
  value,
  onChange,
  onCreateCategory,
  disabled,
}: CategorySelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedCategory = categories.find((c) => c.id === value) ?? null;

  const filtered = categories.filter(
    (c) =>
      c.type === type &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );

  const exactMatch = categories.some(
    (c) => c.type === type && c.name.toLowerCase() === query.trim().toLowerCase(),
  );

  const showCreateOption = query.trim().length > 0 && !exactMatch;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setCreateError(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      setQuery(selectedCategory.name);
    } else if (!value) {
      setQuery('');
    }
  }, [value, selectedCategory]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filtered.length, showCreateOption]);

  const selectCategory = useCallback(
    (categoryId: string) => {
      onChange(categoryId);
      setIsOpen(false);
      setQuery('');
      setCreateError(null);
    },
    [onChange],
  );

  const handleCreate = useCallback(async () => {
    if (!query.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const newCategory = await onCreateCategory(query.trim(), type, randomColor());
      selectCategory(newCategory.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  }, [query, type, onCreateCategory, selectCategory]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      const optionCount = filtered.length + (showCreateOption ? 1 : 0);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < optionCount - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : optionCount - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
            selectCategory(filtered[highlightedIndex].id);
          } else if (highlightedIndex === filtered.length && showCreateOption) {
            handleCreate();
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setQuery('');
          setCreateError(null);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, filtered, showCreateOption, highlightedIndex, selectCategory, handleCreate],
  );

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const displayValue = selectedCategory ? selectedCategory.name : '';
  const inputClasses = [
    styles.input,
    selectedCategory?.color ? styles.inputWithColor : '',
    disabled ? styles.inputDisabled : '',
  ].filter(Boolean).join(' ');

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.inputWrapper}>
        {selectedCategory?.color && (
          <span
            className={styles.colorDot}
            style={{ backgroundColor: selectedCategory.color }}
          />
        )}
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setCreateError(null);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedCategory ? '' : 'Search or create category...'}
          disabled={disabled}
          className={inputClasses}
        />
      </div>

      {isOpen && !disabled && (
        <ul ref={listRef} role="listbox" className={styles.dropdown}>
          {filtered.length === 0 && !showCreateOption && (
            <li className={styles.emptyItem}>No categories found</li>
          )}

          {filtered.map((cat, index) => (
            <li
              key={cat.id}
              role="option"
              aria-selected={cat.id === value}
              onClick={() => selectCategory(cat.id)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={[
                styles.option,
                highlightedIndex === index ? styles.optionHighlighted : '',
                cat.id === value ? styles.optionSelected : '',
              ].filter(Boolean).join(' ')}
            >
              <span
                className={styles.optionColorDot}
                style={{ backgroundColor: cat.color ?? '#D1D5DB' }}
              />
              <span className={styles.optionName}>{cat.name}</span>
              {cat.isFallback && (
                <span className={styles.optionDefault}>default</span>
              )}
            </li>
          ))}

          {showCreateOption && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={handleCreate}
                onMouseEnter={() => setHighlightedIndex(filtered.length)}
                disabled={isCreating}
                className={[
                  styles.createButton,
                  highlightedIndex === filtered.length ? styles.createButtonHighlighted : '',
                ].filter(Boolean).join(' ')}
              >
                <PlusIcon className={styles.createIcon} />
                <span className={styles.createText}>
                  {isCreating ? 'Creating...' : `Create "${query.trim()}"`}
                </span>
              </button>
              {createError && (
                <p className={styles.createError}>{createError}</p>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
