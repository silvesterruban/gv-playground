# Photo Upload Debugging Guide

## How to Access Photo Upload

### 1. Make sure you're logged in as a STUDENT
- Photo upload is only available for student accounts
- Donor accounts don't have this feature

### 2. Navigate to Student Dashboard
- After login, you should see the student dashboard
- Look for your profile photo (or initials placeholder) in the top-left

### 3. Click on your profile photo
- The profile photo should be clickable
- Clicking it should open the photo upload modal

## Troubleshooting Steps

### Step 1: Check if you're logged in as a student
```javascript
// In browser console, check:
localStorage.getItem('userType') // Should be 'student'
localStorage.getItem('token') // Should exist
```

### Step 2: Check for compilation errors
- Open browser developer tools (F12)
- Look at the Console tab for any red error messages
- Look at the Network tab to see if API calls are working

### Step 3: Force refresh the page
- Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh
- This will reload all JavaScript files

### Step 4: Check if the component is loaded
```javascript
// In browser console, check if PhotoUploadModal exists:
window.PhotoUploadModal // Should not be undefined
```

### Step 5: Test the API directly
```bash
# Test if the photo upload endpoint works
curl -X POST http://localhost:3001/api/students/profile/photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@test-image.jpg"
```

## Expected Behavior

1. **Student Dashboard**: Should show your profile photo (or initials)
2. **Clickable Photo**: Clicking the photo should open a modal
3. **Upload Modal**: Should show:
   - Current photo (if any)
   - "Choose Photo" button
   - "Upload Photo" button (after selecting)
   - "Remove Photo" button (if photo exists)

## Common Issues

### Issue: Photo upload modal doesn't open
**Solution**: 
- Make sure you're logged in as a student
- Check browser console for errors
- Try hard refresh (Ctrl+Shift+R)

### Issue: "Choose Photo" button doesn't work
**Solution**:
- Check if you're on web platform (mobile not supported yet)
- Check browser console for file picker errors

### Issue: Upload fails
**Solution**:
- Check if backend is running on port 3001
- Check if you have a valid authentication token
- Check browser network tab for API errors

## Manual Test

1. **Create a test student account**
2. **Login to the student dashboard**
3. **Click on the profile photo area**
4. **Select an image file**
5. **Click "Upload Photo"**
6. **Verify the photo appears on your profile**

## API Endpoints

- `POST /api/students/profile/photo` - Upload photo
- `DELETE /api/students/profile/photo` - Remove photo
- `GET /api/students/profile` - Get profile (includes photo URL) 