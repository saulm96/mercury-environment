'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import type { Category } from '@mercury/shared';

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

  // Filter categories by type and query
  const filtered = categories.filter(
    (c) =>
      c.type === type &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );

  const exactMatch = categories.some(
    (c) => c.type === type && c.name.toLowerCase() === query.trim().toLowerCase(),
  );

  const showCreateOption = query.trim().length > 0 && !exactMatch;

  // Close dropdown on outside click
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

  // Reset query when value changes externally
  useEffect(() => {
    if (selectedCategory) {
      setQuery(selectedCategory.name);
    } else if (!value) {
      setQuery('');
    }
  }, [value, selectedCategory]);

  // Reset highlighted index when filtered list changes
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

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        (items[highlightedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const displayValue = selectedCategory ? selectedCategory.name : '';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {selectedCategory?.color && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
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
          className={`w-full py-3 border border-gray-200 rounded-lg text-mercury-text text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-mercury-primary/10 focus:border-mercury-primary ${
            selectedCategory?.color ? 'pl-8 pr-3' : 'px-3'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-mercury-lg max-h-56 overflow-y-auto"
        >
          {filtered.length === 0 && !showCreateOption && (
            <li className="px-3 py-3 text-sm text-mercury-secondary text-center">
              No categories found
            </li>
          )}

          {filtered.map((cat, index) => (
            <li
              key={cat.id}
              role="option"
              aria-selected={cat.id === value}
              onClick={() => selectCategory(cat.id)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm transition-colors duration-150 ${
                highlightedIndex === index
                  ? 'bg-mercury-primary/5'
                  : 'hover:bg-gray-50'
              } ${cat.id === value ? 'bg-mercury-primary/5 font-medium' : ''}`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color ?? '#D1D5DB' }}
              />
              <span className="text-mercury-text truncate">{cat.name}</span>
              {cat.isFallback && (
                <span className="ml-auto text-xs text-mercury-secondary">default</span>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm transition-colors duration-150 border-t border-gray-100 ${
                  highlightedIndex === filtered.length
                    ? 'bg-blue-50'
                    : 'hover:bg-blue-50'
                } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-mercury-cta flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="text-mercury-cta font-medium">
                  {isCreating ? 'Creating...' : `Create "${query.trim()}"`}
                </span>
              </button>
              {createError && (
                <p className="px-3 py-1.5 text-xs text-rose-600 bg-rose-50">
                  {createError}
                </p>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
