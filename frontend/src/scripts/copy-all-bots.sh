#!/bin/bash

# Copy ALL bot faces with proper numbering

SOURCE_DIR="/home/p0qp0q/Downloads"
DEST_DIR="/home/p0qp0q/Documents/Merlin/JazzyPop/src/images/profile-bots"

# Clean and create destination
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

# Copy ALL bot face files, maintaining uniqueness
counter=1
while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Extract meaningful part of filename for categorization
        basename_full=$(basename "$file")
        
        # Determine category from filename
        category=""
        if [[ $basename_full =~ mustache ]]; then
            category="mustache"
        elif [[ $basename_full =~ beard ]]; then
            category="beard"
        elif [[ $basename_full =~ "lady.*red lipstick" ]]; then
            category="lady-red"
        elif [[ $basename_full =~ "lady.*pink lipstick" ]]; then
            category="lady-pink"
        elif [[ $basename_full =~ "lady.*bubble-gum" ]]; then
            category="lady-bubblegum"
        elif [[ $basename_full =~ eyelashes ]] && [[ ! $basename_full =~ lady ]]; then
            category="eyelash"
        elif [[ $basename_full =~ "happy face.*smile" ]]; then
            category="happy"
        elif [[ $basename_full =~ "emotion growly.*fangs" ]]; then
            category="angry-fangs"
        elif [[ $basename_full =~ "emotion growly" ]] || [[ $basename_full =~ "angry" ]]; then
            category="angry"
        elif [[ $basename_full =~ "shock.*gasp" ]]; then
            category="shocked"
        elif [[ $basename_full =~ "bashful.*shy" ]]; then
            category="shy"
        elif [[ $basename_full =~ "tongue stuck out" ]]; then
            category="tongue"
        elif [[ $basename_full =~ "star.*eye" ]]; then
            category="star-eyes"
        elif [[ $basename_full =~ "heart.*eye" ]]; then
            category="heart-eyes"
        elif [[ $basename_full =~ "dollar.*eye" ]]; then
            category="money-eyes"
        elif [[ $basename_full =~ "spiral.*dizzy" ]]; then
            category="dizzy"
        elif [[ $basename_full =~ "anime weeping" ]]; then
            category="crying"
        else
            category="misc"
        fi
        
        # Copy with unique name using global counter
        new_name="bot-${category}-${counter}.svg"
        cp "$file" "$DEST_DIR/$new_name"
        echo "✓ $new_name <- $(basename "$file")"
        ((counter++))
    fi
done < <(find "$SOURCE_DIR" -name "Firefly face of big eye bot*.svg" -type f | sort)

echo ""
echo "Total bot faces copied: $((counter-1))"
echo "Location: $DEST_DIR"