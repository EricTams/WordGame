#!/usr/bin/env python3
"""
Convert dictionary CSV to JavaScript module.
Run this once to generate src/data/dictionary_data.js from dict_input/filtered_frequency.csv
"""

import csv
import os
import re

INPUT_FILE = 'dict_input/filtered_frequency.csv'
OUTPUT_FILE = 'src/data/dictionary_data.js'

def get_letter_counts(word):
    """Return a dict of letter counts for a word."""
    counts = {}
    for char in word.lower():
        if char.isalpha():
            counts[char] = counts.get(char, 0) + 1
    return counts

def is_valid_word(word):
    """Check if word contains only ASCII letters (with at most one hyphen or apostrophe)."""
    if not word:
        return False
    
    dash_count = 0
    apostrophe_count = 0
    
    for char in word:
        if char.isalpha():
            continue
        elif char == '-':
            dash_count += 1
            if dash_count > 1:
                return False
        elif char == "'":
            apostrophe_count += 1
            if apostrophe_count > 1:
                return False
        else:
            return False
    
    return True

def convert_dictionary():
    """Convert CSV dictionary to JavaScript module."""
    words = []
    
    print(f"Reading {INPUT_FILE}...")
    
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        
        for row in reader:
            if not row:
                continue
            
            word = row[0].strip().lower()
            
            if not is_valid_word(word):
                continue
            
            # Skip very short words (less than 2 chars)
            if len(word) < 2:
                continue
            
            words.append(word)
    
    print(f"Found {len(words)} valid words")
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    print(f"Writing {OUTPUT_FILE}...")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('// AIDEV-NOTE: Auto-generated from dict_input/filtered_frequency.csv\n')
        f.write('// Run: python convert_dictionary.py to regenerate\n')
        f.write(f'// Total words: {len(words)}\n\n')
        
        f.write('export const DICTIONARY = [\n')
        
        for i, word in enumerate(words):
            letters = get_letter_counts(word)
            letters_str = ', '.join(f'{k}: {v}' for k, v in sorted(letters.items()))
            
            # Add comma for all but last entry
            comma = ',' if i < len(words) - 1 else ''
            f.write(f'    {{ word: "{word}", letters: {{ {letters_str} }} }}{comma}\n')
        
        f.write('];\n\n')
        f.write('export default DICTIONARY;\n')
    
    print(f"Done! Created {OUTPUT_FILE} with {len(words)} words")

if __name__ == '__main__':
    convert_dictionary()

