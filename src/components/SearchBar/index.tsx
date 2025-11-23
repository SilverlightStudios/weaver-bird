import { useState, useEffect, useMemo } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { useSelectAllAssets } from "@state/selectors";
import { beautifyAssetName } from "@lib/assetUtils";
import {
  buildSearchSuggestions,
  normalizeQuery,
  type SearchSuggestion,
} from "@lib/searchUtils";
import s from "./styles.module.scss";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search blocks, mobs, textures...",
  debounceMs = 300,
}: Props) {
  // Local state for immediate input display
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);

  // Get all assets from store for suggestions (properly memoized)
  const allAssets = useSelectAllAssets();

  // Sync local state when external value changes (e.g., cleared programmatically)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, debounceMs, onChange, value]);

  // Build suggestions based on current input
  const suggestions = useMemo(() => {
    if (inputValue.length < 2) {
      return [];
    }

    return buildSearchSuggestions(
      allAssets.map((a) => ({ id: a.id, labels: a.labels })),
      inputValue,
      20, // max assets
      5, // max categories
    );
  }, [inputValue, allAssets]);

  // Show suggestions dropdown when there's input >= 2 chars
  const showSuggestions = inputValue.length >= 2 && suggestions.length > 0;

  // Handle selecting a suggestion
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.type === "category") {
      // For categories, set the search to the category name
      const normalized = normalizeQuery(suggestion.name);
      setInputValue(normalized);
      onChange(normalized);
    } else {
      // For assets, set the search to the asset ID
      setInputValue(suggestion.id);
      onChange(suggestion.id);
    }
    setOpen(false);
  };

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    // Show dropdown when user has typed >= 2 characters
    setOpen(newValue.length >= 2);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't let cmdk handle Enter - we want to just search what's typed
    if (e.key === "Enter" && !e.defaultPrevented) {
      // If user hasn't navigated to a suggestion, just close dropdown
      // and let the debounced search happen
      setOpen(false);
      e.stopPropagation();
    } else if (e.key === "Escape") {
      setOpen(false);
      e.stopPropagation();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      // Open dropdown when user starts navigating with arrows
      if (!open && inputValue.length >= 2) {
        setOpen(true);
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = () => {
      setOpen(false);
    };

    // Small delay to avoid immediate close on click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className={s.root}>
      <CommandPrimitive
        className={s.command}
        shouldFilter={false} // We handle filtering ourselves
        onKeyDown={handleKeyDown}
      >
        <div className={s.inputWrapper}>
          <span className={s.searchIcon}>🔍</span>
          <CommandPrimitive.Input
            className={s.input}
            placeholder={placeholder}
            value={inputValue}
            onValueChange={handleInputChange}
            onFocus={() => setOpen(inputValue.length >= 2)}
          />
        </div>

        {showSuggestions && open && (
          <CommandPrimitive.List className={s.suggestionsList}>
            {/* Categories */}
            {suggestions
              .filter((s) => s.type === "category")
              .map((category) => (
                <CommandPrimitive.Item
                  key={category.name}
                  value={category.name}
                  onSelect={() => handleSelectSuggestion(category)}
                  className={s.suggestionItem}
                >
                  <span className={s.categoryIcon}>📁</span>
                  <span className={s.suggestionText}>
                    {category.displayName}
                  </span>
                  <span className={s.suggestionCount}>
                    {category.count} assets
                  </span>
                </CommandPrimitive.Item>
              ))}

            {/* Separator between categories and assets */}
            {suggestions.some((s) => s.type === "category") &&
              suggestions.some((s) => s.type === "asset") && (
                <div className={s.separator} />
              )}

            {/* Assets */}
            {suggestions
              .filter((s) => s.type === "asset")
              .map((asset) => (
                <CommandPrimitive.Item
                  key={asset.id}
                  value={asset.id}
                  onSelect={() => handleSelectSuggestion(asset)}
                  className={s.suggestionItem}
                >
                  <span className={s.assetIcon}>🎨</span>
                  <span className={s.suggestionText}>
                    {beautifyAssetName(asset.id)}
                  </span>
                </CommandPrimitive.Item>
              ))}

            {suggestions.length === 0 && (
              <div className={s.noResults}>No results found</div>
            )}
          </CommandPrimitive.List>
        )}
      </CommandPrimitive>
    </div>
  );
}
