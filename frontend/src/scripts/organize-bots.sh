#!/bin/bash

# Bot organization script - creates profile bot collection

SOURCE_DIR="/home/p0qp0q/Downloads"
DEST_DIR="/home/p0qp0q/Documents/Merlin/JazzyPop/src/images/profile-bots"

# Clean and create destination
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

# Copy and rename each category
copy_category() {
    local pattern="$1"
    local prefix="$2"
    local count=1
    
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            cp "$file" "$DEST_DIR/${prefix}-${count}.svg"
            echo "✓ ${prefix}-${count}.svg"
            ((count++))
        fi
    done < <(find "$SOURCE_DIR" -name "*${pattern}*" -type f | sort)
}

echo "Organizing bot faces..."
echo "======================"

# Process each category
copy_category "mustache" "bot-mustache"
copy_category "beard" "bot-beard"
copy_category "lady.*red lipstick" "bot-lady-red"
copy_category "lady.*pink lipstick" "bot-lady-pink"
copy_category "lady.*bubble-gum" "bot-lady-bubblegum"
copy_category "eyelashes" "bot-eyelash"
copy_category "happy face.*smile" "bot-happy"
copy_category "emotion growly.*fangs" "bot-angry-fangs"
copy_category "emotion growly" "bot-angry"
copy_category "shock.*gasp" "bot-shocked"
copy_category "bashful.*shy" "bot-shy"
copy_category "tongue stuck out" "bot-tongue"
copy_category "star.*eye" "bot-star-eyes"
copy_category "heart.*eye" "bot-heart-eyes"
copy_category "dollar.*eye" "bot-money-eyes"
copy_category "spiral.*dizzy" "bot-dizzy"
copy_category "anime weeping" "bot-crying"

echo ""
echo "Bot faces organized in: $DEST_DIR"
echo "Total files: $(ls -1 "$DEST_DIR" | wc -l)"