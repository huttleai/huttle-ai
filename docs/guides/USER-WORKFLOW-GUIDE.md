# Content Library User Workflow Guide

## 📖 Complete User Journey

This guide walks through the exact workflow you described, showing how users interact with the Content Library.

---

## 🎬 Scenario: Creating a Project with Content

### Step 1: Create a New Project

**User Action**: I want to organize my content, so I create a project first.

1. Navigate to **Content Library**
2. Look at the project filter bar (top of page)
3. Click the **"New Project"** button (gradient blue button)

**What Opens**: Create Project Modal appears with:
- Project Name field (required)
- Description field (optional)
- Color picker showing 10 beautiful colors
- Live preview of how the project will look
- Character counters (50 for name, 200 for description)

4. Fill in details:
   ```
   Name: "Summer Campaign 2024"
   Description: "Content for our summer marketing push"
   Color: Select Orange (#f97316)
   ```

5. Click **"Create Project"** button

**Result**: 
- ✅ Modal closes smoothly
- ✅ Toast notification: "Project created successfully"
- ✅ New orange project button appears in filter bar
- ✅ Project shows (0) items

---

### Step 2: Upload Text Ideas (Hashtags & Keywords)

**User Action**: I have some hashtag ideas to add to my project.

1. Click **"Upload Content"** button (main action button)

**What Opens**: Upload Modal with:
- Content type selector (Image, Video, Text Idea)
- File upload area
- Name field
- Project selector dropdown

2. Select **"Text Idea"** type
3. A text area appears
4. Enter content:
   ```
   #SummerVibes #BeachLife #SunnyDays #VacationMode
   summer, beach, vacation, travel, relaxation
   Keywords: summer sale, beach essentials, summer fashion
   ```

5. Enter name: `"Summer Hashtags & Keywords"`

6. In **"Assign to Project"** dropdown:
   - Select "Summer Campaign 2024"

7. Click **"Upload"**

**Result**:
- ✅ Modal closes
- ✅ Content appears in the grid
- ✅ Project counter updates: Summer Campaign 2024 (1)
- ✅ Storage meter shows 0 MB used (text doesn't count toward storage)

---

### Step 3: Upload First Photo

**User Action**: I have a beach photo to add.

1. Click **"Upload Content"** button again
2. Select **"Image"** type
3. Click the upload area or drag photo
4. Select file: `beach-sunset.jpg` (2.5 MB)

**Behind the Scenes**:
- Image is compressed client-side
- Toast: "Compressing image..."
- Toast: "Compressed: saved 1.8MB (72% smaller)!"

5. Enter name: `"Beach Sunset Shot"`
6. Project dropdown already shows "Summer Campaign 2024" (last selected)
7. Click **"Upload"**

**Result**:
- ✅ Toast: "Uploading file..."
- ✅ Toast: "Content saved successfully!"
- ✅ Photo appears in grid with thumbnail
- ✅ Project counter: Summer Campaign 2024 (2)
- ✅ Storage meter: 0.7/100 MB

---

### Step 4: Upload Second Photo

**User Action**: Adding another photo to the project.

1. Repeat upload process
2. File: `beach-accessories.jpg` (1.8 MB)
3. Name: `"Beach Accessories Flatlay"`
4. Project: "Summer Campaign 2024"
5. Upload

**Result**:
- ✅ Second photo appears
- ✅ Project counter: Summer Campaign 2024 (3)
- ✅ Storage meter: 1.2/100 MB

---

### Step 5: Upload Third Photo

**User Action**: One more photo for the project.

1. Repeat upload process
2. File: `palm-trees.jpg` (2.1 MB)
3. Name: `"Palm Trees Background"`
4. Project: "Summer Campaign 2024"
5. Upload

**Result**:
- ✅ Third photo appears
- ✅ Project counter: Summer Campaign 2024 (4)
- ✅ Storage meter: 1.9/100 MB
- ✅ All three photos + text ideas now visible when project is selected

---

### Step 6: View All Project Content

**User Action**: I want to see only content in this project.

1. Click on **"Summer Campaign 2024"** project button in filter bar

**Result**:
- ✅ Button turns orange (project color)
- ✅ Grid shows only 4 items from this project:
  - Summer Hashtags & Keywords (text)
  - Beach Sunset Shot (image)
  - Beach Accessories Flatlay (image)
  - Palm Trees Background (image)
- ✅ Other content is hidden

---

## 🗑️ Deletion Workflows

### Option A: Delete Individual Content Item

**User Action**: I don't like one of the photos anymore and want to delete it completely.

1. Click on "Beach Accessories Flatlay" photo
2. Detail modal opens showing:
   - Large preview of image
   - Name, type, size, date
   - Download button
   - "Change Project" button
   - "Remove from Project" button (orange, because it's in a project)
   - **"Delete Permanently"** button (red, prominent)

3. Click **"Delete Permanently"** button

**What Opens**: Delete Confirmation Modal
- ⚠️ Red warning icon
- Title: "Delete Content"
- Message: "This will permanently delete this content from your library."
- Item name: "Beach Accessories Flatlay"
- Red warning box:
  - "This action cannot be undone"
  - "This file will be permanently removed from your storage and cannot be recovered."
- Two buttons:
  - "No, Keep Content" (gray, left)
  - "Yes, Delete Permanently" (red, right)

4. User has a moment to reconsider
5. Click **"Yes, Delete Permanently"**

**Result**:
- ✅ Button shows loading spinner: "Deleting..."
- ✅ Modal closes
- ✅ Detail modal closes
- ✅ Photo disappears from grid
- ✅ Toast: "Content deleted successfully"
- ✅ Project counter: Summer Campaign 2024 (3)
- ✅ Storage meter: 1.3/100 MB (freed up space)

---

### Option B: Remove from Project (Keep in Library)

**User Action**: I want the hashtags in "All Content" instead of this project.

1. Click on "Summer Hashtags & Keywords"
2. Detail modal opens
3. Notice two separate buttons:
   - "Change Project" - to move to another project
   - **"Remove from Project"** - to unassign from this project

4. Click **"Remove from Project"**

**No Confirmation Needed** (not destructive - content stays in library)

**Result**:
- ✅ Content stays in library
- ✅ No longer shows when "Summer Campaign 2024" filter is active
- ✅ Shows when "All Content" filter is active
- ✅ Toast: "Removed from project"
- ✅ Project counter: Summer Campaign 2024 (2)

---

### Option C: Delete Entire Project

**User Action**: Summer campaign is over, I want to delete the project.

1. Hover over **"Summer Campaign 2024"** project button
2. Two small circular icons appear in top-right:
   - Blue edit icon
   - Red delete icon (trash)

3. Click the **red delete icon**

**What Opens**: Delete Confirmation Modal
- ⚠️ Red warning icon
- Title: "Delete Project"
- Message: "Are you sure you want to delete this project?"
- Item name: "Summer Campaign 2024"
- Red warning box:
  - "This action cannot be undone"
  - "All content in this project will remain in your library, but will no longer be associated with this project."
- Two buttons:
  - "No, Keep Project" (gray)
  - "Yes, Delete Project" (red)

4. Click **"Yes, Delete Project"**

**Result**:
- ✅ Button shows: "Deleting..."
- ✅ Modal closes
- ✅ Project button disappears from filter bar
- ✅ **Content remains in library** (shown in "All Content")
- ✅ Content now has no project assignment
- ✅ Toast: "Project deleted successfully"
- ✅ Filter automatically switches to "All Content"

---

## 📥 Download Workflows

### Download Text Content

**User Action**: I want to download my hashtags document.

1. Click on text content item
2. Detail modal opens
3. Click **"Download"** button

**Result**:
- ✅ `.txt` file downloads: `Summer Hashtags & Keywords.txt`
- ✅ Contains all the text content
- ✅ Works on both desktop and mobile
- ✅ Toast: "Download started!"

---

### Download Image

**User Action**: I want to download the beach photo.

1. Click on image
2. Detail modal shows image preview
3. Click **"Download"** button

**Result**:
- ✅ Full-resolution image downloads
- ✅ Original filename or custom name
- ✅ Works on mobile (saves to photos)
- ✅ Toast: "Download started!"

---

## 🎨 Project Management

### Edit Project

**User Action**: I want to change the project name and color.

1. Hover over project button
2. Click **blue edit icon**
3. Edit Project modal opens (pre-filled with current values):
   - Name: "Summer Campaign 2024"
   - Description: "Content for our summer marketing push"
   - Color: Orange

4. Make changes:
   - Name: "Summer 2024 - Complete"
   - Color: Change to Emerald Green

5. Click **"Update Project"**

**Result**:
- ✅ Modal closes
- ✅ Project button updates with new name and color
- ✅ Toast: "Project updated successfully"
- ✅ All content assignments remain intact

---

### Create Project During Upload

**User Action**: I'm uploading content and realize I need a new project.

1. In Upload Modal
2. Look at "Assign to Project" section
3. See dropdown with existing projects
4. Click **"New"** button next to dropdown

**What Opens**: Create Project Modal (same as before)

5. Create project: "Quick Project"
6. Click "Create Project"

**Result**:
- ✅ Create Project Modal closes
- ✅ Upload Modal stays open
- ✅ Dropdown automatically selects "Quick Project"
- ✅ Can now complete upload with new project selected
- ✅ Toast: "Project created successfully"

---

## 🔄 Change Project Assignment

**User Action**: I want to move content from one project to another.

1. Click on content item
2. Detail modal opens
3. Click **"Change Project"** button

**What Opens**: Add to Project Modal
- Lists all available projects
- Shows checkmark on current project
- "Remove from all projects" option at bottom

4. Click on a different project

**Result**:
- ✅ Modal closes
- ✅ Content moved to new project
- ✅ Toast: "Added to [Project Name]"
- ✅ Project counters update

---

## 📱 Mobile Experience

All workflows work seamlessly on mobile with:
- ✅ Touch-friendly buttons
- ✅ Responsive modals
- ✅ Swipeable project filters
- ✅ Mobile file picker
- ✅ Native download experience
- ✅ Optimized layout for small screens

---

## ⚠️ Safety Features

### Before Any Deletion
1. **Clear Confirmation Modal** appears
2. **Explicit Warning**: "This action cannot be undone"
3. **Consequence Description**: Exactly what will happen
4. **Item Name Shown**: So you know what you're deleting
5. **Two Buttons**: Easy to cancel, intentional to confirm
6. **Color Coding**: Red for dangerous actions

### Storage Protection
- ✅ Warning at 90% storage
- ✅ Upload blocked at 100%
- ✅ Upgrade modal suggests next tier
- ✅ Compression automatically applied

### Error Handling
- ✅ Network errors: "Please check your connection"
- ✅ Permission errors: "You may not have access"
- ✅ Quota errors: "Storage limit exceeded"
- ✅ Friendly error messages (no technical jargon)

---

## 🎯 Summary

The workflow is designed to be:
1. **Intuitive**: Actions are where you expect them
2. **Safe**: Destructive actions require confirmation
3. **Clear**: Always know what will happen
4. **Flexible**: Multiple ways to accomplish tasks
5. **Forgiving**: Can undo most actions (except permanent delete)
6. **Professional**: Beautiful design that inspires confidence

Every interaction has been carefully designed to match your original vision while adding professional polish and user safety features.

