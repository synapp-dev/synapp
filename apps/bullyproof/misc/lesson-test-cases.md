# Recommendation System - Comprehensive Test Cases

This document lists all possible scenarios, edge cases, and outliers that need to be tested and have applicable UI implementations for the lesson recommendation system.

## Flow Overview

1. **Entry**: User opens lesson wizard (e.g., from hero "Start new lesson" or lessons page)
2. **Step 0**: Choose "Prepare & Teach Lesson" or "Browse Lesson Library"
3. **Feedback Guard**: If Teach selected, API checks for outstanding feedback (lessons with `status=feedback` owned by current teacher). If any exist, user must address them before proceeding.
4. **Step 1**: Class selection
5. **Step 2**: Recommendation (with active lessons handling, curriculum stage logic)
6. **Step 3**: Topic selection (optional if recommendation used)
7. **Step 4**: Confirmation (Prepare lesson / Start lesson)

Lesson lifecycle: `preparing` → `ready` → `in_progress` → `feedback` → `completed`

## Test Case Categories

### 0. Wizard Entry and Feedback Guard

#### TC-000A: Wizard Opens with Teach vs View Choice
**Scenario**: User opens the lesson wizard
**Expected**: Show two options to choose from
**UI**:
- Card: "Prepare & Teach Lesson" – Set up a lesson to deliver to a class
- Card: "Browse Lesson Library" – Explore lesson materials without teaching

#### TC-000B: User Clicks Browse Lesson Library
**Scenario**: User selects "Browse Lesson Library"
**Expected**: Close wizard and navigate to content
**UI**:
- Wizard closes
- Navigate to `/schools/{schoolSlug}/content`

#### TC-000C: Prepare & Teach with No Outstanding Feedback
**Scenario**: User clicks "Prepare & Teach Lesson" and has no lessons awaiting feedback
**Expected**: Proceed to class selection (Step 1)
**UI**:
- Loading indicator while checking outstanding feedback
- Navigate to Step 1 (Class selection)

#### TC-000D: Prepare & Teach with Outstanding Feedback (Feedback Gate)
**Scenario**: User clicks "Prepare & Teach Lesson" and has one or more lessons in "feedback" status that they own
**Expected**: Block progression, show feedback gate
**UI**:
- Purple alert: "Feedback required before starting another lesson"
- List of outstanding feedback lessons (LessonCard for each)
- "Go to lesson" button per lesson (navigates to `/schools/{schoolSlug}/lessons/{lessonId}/feedback`)
- "Back" button returns to Teach vs View screen
- User cannot proceed to class selection until feedback is completed (or navigates away to complete it)

#### TC-000E: Outstanding Feedback Definition
**Scenario**: System determines if teacher has outstanding feedback
**Expected**: Lessons with `status=feedback` and `createdByUserId` = current teacher
**Note**: Used to gate starting new lessons; distinct from TC-010 (selected class has feedback lesson at recommendation step).

---

### 1. Basic Recommendation Scenarios

#### TC-001: No Completed Lessons, No Active Lessons
**Scenario**: Class has never completed any lessons and has no active lessons
**Expected**: Recommend first topic in matching curriculum stage
**UI**: 
- **Loading state**: Show skeleton card (matching card layout) instead of loading circle
- Show recommended topic card
- **Below card**: Show topic list for curriculum stage
  - List all topics in stage (1, 2, 3, 4, etc.)
  - Show checkmarks (✓) next to completed topics (none in this case)
  - Highlight recommended topic (topic 1)
- Normal "Proceed" button

#### TC-002: Completed Lessons in Order
**Scenario**: Class completed topics 1, 2, 3 sequentially
**Expected**: Recommend topic 4
**UI**: 
- Show recommended lesson card
- **Below card**: Show topic list for curriculum stage
  - List all topics: 1 ✓, 2 ✓, 3 ✓, **4** (highlighted), 5, 6, etc.
  - Checkmarks next to completed topics (1, 2, 3)
  - Highlight recommended topic (4)
- Normal "Proceed" button

#### TC-003: Completed Lessons Out of Order
**Scenario**: Class completed topic 4, but topics 1, 2, 3 are not completed
**Expected**: Recommend topic 1 (earliest incomplete)
**UI**: 
- Show recommended topic card
- **Below card**: Show topic list for curriculum stage
  - List all topics: **1** (highlighted), 2, 3, 4 ✓, 5, 6, etc.
  - Checkmark next to completed topic (4)
  - Highlight recommended topic (1) - earliest incomplete
- Normal "Proceed" button

#### TC-004: All Topics Completed in Stage
**Scenario**: Class completed all topics (1-10) in a curriculum stage
**Expected**: Show message that class completed everything in this stage, offer to progress to next stage
**UI**: 
- Message: "[Class] has already completed everything in [Stage Name]"
- Question: "Would you like to progress to the next stage?"
- Show next stage's first topic as recommendation
- Normal "Proceed" button

#### TC-005: Multiple Classes, Same Completion State
**Scenario**: Two classes both completed topic 3
**Expected**: Recommend topic 4 for both
**UI**: 
- Show recommended topic card
- **Below card**: Show topic list for curriculum stage
  - List all topics: 1, 2, 3 ✓, **4** (highlighted), 5, 6, etc.
  - Checkmark next to completed topic (3) for both classes
  - Highlight recommended topic (4)
- Normal "Proceed" button

#### TC-006: Multiple Classes, Different Completion States
**Scenario**: Class A completed topic 2, Class B completed topic 5
**Expected**: 
- If both classes in same curriculum stage: Recommend lowest incomplete topic that both haven't completed
- If classes in different curriculum stages: Explain incompatibility
**UI**: 
- **Same stage**: Show recommended topic (lowest incomplete for both), normal "Proceed" button
- **Different stages**: Yellow warning alert: "Each class has started topics in different curriculum stages and are therefore incompatible to teach together"
- Cannot proceed until resolved (user must select classes from same stage)

---

### 2. Active Lesson Scenarios - Single Class

#### TC-007: Class Has Preparing Lesson
**Scenario**: Selected class has a lesson in "preparing" status
**Expected**: Show preparing lesson information
**UI**: 
- Amber/yellow alert: "[Class] already has a lesson being prepared"
- Show lesson details (topic, status)
- Button: "Go to lesson" (replaces Proceed)
- Action: Navigate to preparing lesson

#### TC-008: Class Has Ready Lesson
**Scenario**: Selected class has a lesson in "ready" status
**Expected**: Show ready lesson information
**UI**:
- Blue/info alert: "[Class] has a lesson ready"
- Show lesson details
- Button: "Go to lesson" (replaces Proceed)
- Action: Navigate to ready lesson

#### TC-009: Class Has In-Progress Lesson
**Scenario**: Selected class has a lesson in "in_progress" status
**Expected**: Block new lesson creation
**UI**:
- Red blocking alert: "Live Lesson in Progress"
- Show lesson details (topic, status, **owner name**)
- Description: "In order to proceed, you must either complete the lesson thoroughly (go through all slides, give feedback, and mark as completed) or cancel this lesson if you are the owner"
- **If user is owner**: Show "Cancel this lesson" option
- **If user is not owner**: Show "Contact [Owner Name] to cancel their lesson"
- Button: "Go to Live Lesson"
- Action: Navigate to live lesson, cannot proceed

#### TC-010: Class Has Feedback Lesson
**Scenario**: Selected class has a lesson in "feedback" status (at recommendation step, after passing feedback gate)
**Expected**: Block new lesson creation, show feedback required message
**Note**: Differs from Feedback Guard (TC-000D): Feedback Guard blocks at wizard start for lessons *owned by the teacher*; TC-010 blocks when a *selected class* has a lesson in feedback status at the recommendation step.
**UI**:
- Red blocking alert: "Feedback Required"
- Show lesson details (topic, status, owner)
- Description: "In order to proceed, you must either complete the lesson thoroughly (go through all slides, give feedback, and mark as completed) or cancel this lesson if you are the owner"
- Button: "Go to Feedback" (navigates to feedback subroute)
- Action: Navigate to `/schools/{schoolSlug}/lessons/{lessonId}/feedback`, cannot proceed

#### TC-011: Class Has Preparing Lesson + Completed Topics
**Scenario**: Class has preparing lesson AND has completed some topics
**Expected**: Show preparing lesson (conflict), but recommendation algorithm still uses completed topics
**UI**:
- Show preparing lesson alert
- Show recommended topic card (based on completed topics)
- Button: "Go to lesson" (preparing takes precedence)

---

### 3. Active Lesson Scenarios - Multiple Classes

#### TC-012: All Classes Share Same Preparing Lesson
**Scenario**: Two selected classes both assigned to same preparing lesson
**Expected**: Show single preparing lesson
**UI**:
- Amber alert: "[Class A] and [Class B] already have a lesson being prepared"
- Show lesson details
- Button: "Go to lesson" (replaces Proceed)
- Action: Navigate to preparing lesson

#### TC-013: Some Classes Have Preparing Lesson, Some Don't
**Scenario**: Class A has preparing lesson, Class B doesn't
**Expected**: Offer to add Class B to existing lesson
**UI**:
- Amber alert: "You already have [Class A] being prepared for a lesson. Would you like to add [Class B] to that lesson instance?"
- Show lesson details (topic, status, owner)
- Buttons: "Add [Class B] to lesson" + "Choose different topic"
- **After successful add**: 
  - Show success message
  - Footer button changes to "Take me to lesson"
  - Action: Navigate to `/schools/{schoolSlug}/lessons/{lessonId}` (lesson page)
- **If add fails**: Show error, allow retry

#### TC-014: Multiple Classes, Different Preparing Lessons
**Scenario**: Class A has preparing lesson X, Class B has preparing lesson Y
**Expected**: Show both preparing lessons
**UI**:
- Amber alert listing both lessons
- Show details for each lesson
- Buttons: "Go to lesson" for each
- Action: Navigate to respective lessons

#### TC-015: Mix of Preparing and Live Lessons
**Scenario**: Class A has preparing lesson, Class B has in_progress lesson
**Expected**: Show both, but live lesson blocks
**UI**:
- Red alert for live lesson (blocking)
- Amber alert for preparing lesson (informational)
- Button: "Go to Live Lesson" (only option)
- Cannot proceed until live lesson resolved

#### TC-016: Mix of Ready and Preparing Lessons
**Scenario**: Class A has ready lesson, Class B has preparing lesson
**Expected**: Show both lessons, offer option to cancel and create combined lesson
**UI**:
- Blue alert for ready lesson (show owner)
- Amber alert for preparing lesson (show owner)
- **If user owns both lessons**:
  - Option: "Cancel both lessons and create a new combined lesson"
  - Button: "Cancel and Create New Lesson"
  - Action: Cancel both lessons, create new preparing lesson with both classes, navigate to new lesson
- Buttons: "Go to lesson" for each
- Can proceed (not blocking) OR cancel and combine

#### TC-017: All Classes Have Different Active Lessons
**Scenario**: 3 classes, each with different active lessons (mix of preparing, ready, in_progress, feedback)
**Expected**: Show all lessons with owner information and completion instructions
**UI**:
- List all lessons with details (topic, status, **owner name**)
- **For live lessons (in_progress/feedback)**:
  - Description: "In order to proceed, you must either complete the lesson thoroughly (go through all slides, give feedback, and mark as completed) or cancel this lesson if you are the owner"
- **For each lesson**:
  - Show owner: "Owner: [Teacher Name]" or "You are the owner"
  - If user owns all lessons: "You should go ahead and cancel all of these lessons"
  - If some lessons owned by others: "You should contact [Owner Name] to cancel their lesson" or "[Owner Name] is in charge of that lesson, they need to figure it out"
- Buttons: "Go to lesson" for each (or "Go to Feedback" for feedback status)
- Action: Navigate to respective lessons

---

### 4. Curriculum Stage Scenarios

#### TC-018: Single Curriculum Stage
**Scenario**: All selected classes belong to same curriculum stage
**Expected**: Normal recommendation flow
**UI**: Standard recommendation card, proceed button

#### TC-019: Multiple Curriculum Stages
**Scenario**: Selected classes belong to different curriculum stages (Early Primary, Upper Primary)
**Expected**: Show stage selection
**UI**:
- Amber alert: "Multiple Lesson Levels Detected"
- Cards for each stage with classes listed
- Radio button selection
- Button: "Continue to Topic Selection" (after selection)

#### TC-020: Class Belongs to Multiple Stages (Edge Case)
**Scenario**: A class is associated with multiple curriculum stages
**Expected**: Handle gracefully, show all applicable stages
**UI**:
- Show all stages the class belongs to
- Allow user to select which stage to use
- Recommendation based on selected stage

#### TC-021: Classes with No Matching Stage
**Scenario**: Selected classes have year codes that don't match any curriculum stage
**Expected**: Fallback to first available topic
**UI**:
- Show recommended topic with fallback reason
- Normal proceed button

---

### 5. Topic Completion Edge Cases

#### TC-022: Topics Completed Out of Order (Multiple Gaps)
**Scenario**: Class completed topics 1, 4, 7 (gaps at 2, 3, 5, 6)
**Expected**: Recommend topic 2 (earliest incomplete)
**UI**: Show recommended topic card, normal proceed

#### TC-023: Topics Completed Out of Order (Last First)
**Scenario**: Class completed topic 10, but topics 1-9 are not completed
**Expected**: Recommend topic 1
**UI**: Show recommended topic card, normal proceed

#### TC-024: Topics Completed Out of Order (Middle First)
**Scenario**: Class completed topic 5, but topics 1-4 and 6-10 are not completed
**Expected**: Recommend topic 1
**UI**: Show recommended topic card, normal proceed

#### TC-025: Some Topics Completed, Some Have Active Lessons
**Scenario**: Class completed topics 1-3, has preparing lesson for topic 4
**Expected**: Show preparing lesson, but recommendation could be topic 4 or next incomplete
**UI**:
- Show preparing lesson alert
- Show recommended topic (if different from preparing)
- Button: "Go to lesson" (preparing takes precedence)

#### TC-026: All Topics Completed Across Multiple Stages
**Scenario**: Class completed all topics in Early Primary, some in Upper Primary
**Expected**: Recommend first incomplete topic in Upper Primary
**UI**: Show recommended topic card, normal proceed

---

### 6. Combination Scenarios

#### TC-027: Completed Lessons + Preparing Lesson + Live Lesson
**Scenario**: Class has completed topics, preparing lesson, AND live lesson
**Expected**: Live lesson blocks, show all information
**UI**:
- Red alert for live lesson (blocking)
- Amber alert for preparing lesson
- Show completed topics info
- Button: "Go to Live Lesson" only

#### TC-028: Multiple Classes with Mixed States
**Scenario**: 
- Class A: Completed topic 3, has preparing lesson
- Class B: Completed topic 5, no active lessons
- Class C: No completed topics, has in_progress lesson
**Expected**: Live lesson blocks, show all information
**UI**:
- Red alert for Class C's live lesson (blocking)
- Amber alert for Class A's preparing lesson
- Warning about different completion states
- Button: "Go to Live Lesson" only

#### TC-029: Preparing Lesson for Different Topic Than Recommended
**Scenario**: Class has preparing lesson for topic 5, but recommendation algorithm suggests topic 2 (earlier incomplete)
**Expected**: Show both, preparing lesson takes precedence for navigation
**UI**:
- Show preparing lesson alert
- Show recommended topic card (topic 2)
- Button: "Go to lesson" (preparing) + option to "Choose different topic"

---

### 7. Data Edge Cases

#### TC-030: Missing Topic Data
**Scenario**: Active lesson exists but topic data is missing/null
**Expected**: Handle gracefully, show lesson ID, allow navigation
**UI**: Show lesson with "Unknown Topic", still allow navigation

#### TC-031: Missing Stage Data
**Scenario**: Completed lesson has topic but stage data is missing
**Expected**: Handle gracefully, skip stage-based recommendation
**UI**: Fallback recommendation, show warning if needed

#### TC-032: Very Long Topic Title
**Scenario**: Recommended topic has extremely long title (>100 characters)
**Expected**: Truncate with ellipsis, show tooltip on hover
**UI**: Truncated title with tooltip showing full title

#### TC-033: Topic with No Slides
**Scenario**: Recommended topic exists but has 0 slides
**Expected**: Show topic with "0 slides" badge
**UI**: Show topic card with slide count badge showing "0 slides"

#### TC-034: Class with No Year Codes
**Scenario**: Selected class has no associated year codes
**Expected**: Fallback to first available topic
**UI**: Show recommended topic with fallback reason

#### TC-035: Empty Class Selection
**Scenario**: User navigates to recommendation step with no classes selected
**Expected**: Prevent navigation or show error
**UI**: Error message, disable proceed button

---

### 8. Navigation and Interaction Scenarios

#### TC-036: Navigate to Preparing Lesson
**Scenario**: User clicks "Go to lesson" for preparing lesson
**Expected**: Navigate to lesson prepare page
**UI**: Router navigation to `/schools/{schoolSlug}/lessons/{lessonId}/prepare`

#### TC-037: Navigate to Ready Lesson
**Scenario**: User clicks "Go to lesson" for ready lesson
**Expected**: Navigate to lesson page
**UI**: Router navigation to `/schools/{schoolSlug}/lessons/{lessonId}`

#### TC-038: Navigate to Live Lesson
**Scenario**: User clicks "Go to Live Lesson"
**Expected**: Navigate to live lesson page
**UI**: Router navigation to `/schools/{schoolSlug}/lessons/{lessonId}`

#### TC-039: Add Class to Existing Preparing Lesson
**Scenario**: User clicks "Add [Class] to lesson"
**Expected**: Update lesson to include new class
**UI**:
- Show loading state
- Update lesson via API
- Show success message
- Navigate to updated lesson OR refresh recommendation

#### TC-040: Add Class Fails (API Error)
**Scenario**: Adding class to lesson fails (network error, permission error)
**Expected**: Show error message, allow retry
**UI**: Error alert, retry button, keep recommendation state

---

### 9. UI State Scenarios

#### TC-041: Loading State
**Scenario**: Recommendation data is being fetched
**Expected**: Show loading indicator
**UI**: Spinner, "Loading recommendations..." message

#### TC-042: Error State
**Scenario**: Failed to fetch recommendations
**Expected**: Show error message with retry option
**UI**: Error alert, "Try again" button, "Choose topic manually" option

#### TC-043: Partial Data Load
**Scenario**: Active lessons loaded but topic recommendation failed
**Expected**: Show active lessons, show fallback for recommendation
**UI**: Show active lessons alerts, show fallback recommendation or error

#### TC-044: Rapid Class Selection Changes
**Scenario**: User rapidly selects/deselects classes
**Expected**: Debounce queries, show loading during transitions
**UI**: Loading state during rapid changes, prevent duplicate queries

---

### 10. Permission and Security Scenarios

#### TC-045: Unauthorized Access
**Scenario**: User tries to access classes they don't have permission for
**Expected**: Return 401/403 error
**UI**: Error message, prevent proceeding

#### TC-046: Cross-School Classes
**Scenario**: User selects classes from different schools (shouldn't happen in UI, but API should handle)
**Expected**: Return error or filter to single school
**UI**: Error message, prevent proceeding

#### TC-047: Deleted/Inactive Classes
**Scenario**: Selected class ID references deleted or inactive class
**Expected**: Filter out invalid classes, proceed with valid ones
**UI**: Warning about invalid classes, proceed with valid selection

---

### 11. Year Code and Stage Matching Scenarios

#### TC-048: Class with Multiple Year Codes Matching Different Stages
**Scenario**: Class has year codes that match multiple curriculum stages
**Expected**: Show all matching stages, allow selection
**UI**: Multiple stage cards, selection required

#### TC-049: Year Codes Don't Match Any Stage
**Scenario**: Class has year codes that don't match any curriculum stage
**Expected**: Fallback to first available topic
**UI**: Show recommended topic with fallback reason

#### TC-050: Year Codes Match Stage But No Topics Exist
**Scenario**: Stage exists but has no topics
**Expected**: Show error or fallback
**UI**: Error message, suggest choosing different classes

---

### 12. Button State Scenarios

#### TC-051: All Classes Have Same Preparing Lesson
**Expected Button**: "Go to lesson" (replaces Proceed)
**UI**: Single button, navigates to lesson

#### TC-052: Some Classes Can Be Added to Preparing Lesson
**Expected Buttons**: "Add [Class] to lesson" + "Choose different topic"
**UI**: Two buttons side by side

#### TC-053: Live Lesson Exists
**Expected Button**: "Go to Live Lesson" only, Proceed disabled
**UI**: Single button, Proceed button hidden/disabled

#### TC-054: No Conflicts, Normal Flow
**Expected Button**: "Proceed" with chevrons
**UI**: Standard proceed button

#### TC-055: Multiple Different Active Lessons
**Expected Buttons**: "Go to lesson" for each lesson
**UI**: Multiple buttons in alert sections

---

### 13. Recommendation Reason Scenarios

#### TC-056: Next Topic Reason
**Scenario**: Classes completed topic 3, recommend topic 4
**UI**: Show "This is the recommended lesson for [Class Name] because they have completed [Topic Name]"

#### TC-057: Fallback Year Match Reason
**Scenario**: No completed lessons, match by year codes
**UI**: Show "This is the recommended lesson to begin on" (for [Class Name])

#### TC-058: Final Fallback Reason
**Scenario**: No year code match, no completed lessons
**UI**: Show "This is the recommended lesson to begin on" (for [Class Name])

#### TC-059: Out-of-Order Completion Reason
**Scenario**: Completed topic 4, recommend topic 1
**UI**: Show "This is the recommended lesson for [Class Name] because they have completed [Topic Name]" (where Topic Name is the completed topic, and recommendation is the earliest incomplete)

---

### 14. Visual and Layout Scenarios

#### TC-060: Many Active Lessons (5+)
**Scenario**: Multiple classes with many different active lessons
**Expected**: Scrollable list, organized by status
**UI**: Scrollable alert sections, grouped by status type

#### TC-061: Long Class Names
**Scenario**: Class names are very long
**Expected**: Truncate or wrap appropriately
**UI**: Truncated class names with tooltip or wrapped text

#### TC-062: Many Year Codes
**Scenario**: Stage has 10+ year codes
**Expected**: Display all codes, handle overflow
**UI**: Wrapped year codes, scrollable if needed

#### TC-063: Responsive Layout
**Scenario**: View on mobile device
**Expected**: Layout adapts, buttons stack vertically
**UI**: Responsive card layout, stacked buttons on mobile

---

### 15. Integration Scenarios

#### TC-064: Recommendation Step → Topic Selection Step
**Scenario**: User proceeds from recommendation to topic selection
**Expected**: Pre-select recommended topic if available
**UI**: Topic selection shows recommended topic highlighted

#### TC-065: Recommendation Step → Confirmation Step (Skip Topic Selection)
**Scenario**: User proceeds directly from recommendation to confirmation
**Expected**: Use recommended topic, skip topic selection
**UI**: Confirmation shows recommended topic details

#### TC-066: Back Navigation from Recommendation
**Scenario**: User clicks back from recommendation step
**Expected**: Return to class selection, preserve selections
**UI**: Return to step 1, classes still selected

#### TC-067: Close Wizard During Recommendation
**Scenario**: User closes wizard while on recommendation step
**Expected**: Reset state, clear selections
**UI**: Wizard closes, state resets on next open

---

### 16. Cancel and Combine Lesson Scenarios

#### TC-077: Cancel Multiple Owned Lessons and Create Combined
**Scenario**: User owns multiple active lessons (ready/preparing) for different classes
**Expected**: Offer to cancel all and create new combined lesson
**UI**:
- Show all owned lessons with details
- Option: "Cancel all these lessons and create a new combined lesson"
- Button: "Cancel and Create New Lesson"
- Action: 
  1. Cancel all existing lessons
  2. Create new preparing lesson with all classes
  3. Navigate to new lesson page

#### TC-078: Cancel Owned Lesson, Keep Others
**Scenario**: User owns some lessons, others owned by different teachers
**Expected**: Show cancel option only for owned lessons
**UI**:
- List all lessons with owner information
- Cancel buttons only on lessons user owns
- Message: "You can cancel your lessons, but must contact [Owner] for others"

#### TC-079: Cancel Lesson Confirmation
**Scenario**: User clicks cancel on active lesson
**Expected**: Show confirmation dialog
**UI**:
- Confirmation dialog: "Are you sure you want to cancel this lesson? This action cannot be undone."
- Buttons: "Cancel Lesson" (destructive) + "Keep Lesson" (secondary)
- After confirmation: Cancel lesson, refresh recommendations

### 17. Performance Scenarios

#### TC-068: Many Classes Selected (10+)
**Scenario**: User selects 10+ classes
**Expected**: Query handles efficiently, UI remains responsive
**UI**: Loading states, efficient rendering

#### TC-069: Many Completed Topics
**Scenario**: Class has completed 50+ topics
**Expected**: Efficient query and recommendation calculation
**UI**: Fast recommendation display

#### TC-070: Concurrent Recommendations
**Scenario**: Multiple users requesting recommendations simultaneously
**Expected**: API handles load, no blocking
**UI**: No impact on individual user experience

---

## Test Case Summary

**Total Test Cases**: 84

**Categories**:
- Wizard Entry and Feedback Guard: 5 cases
- Basic Recommendation: 6 cases
- Active Lessons (Single Class): 5 cases
- Active Lessons (Multiple Classes): 5 cases
- Curriculum Stages: 4 cases
- Topic Completion Edge Cases: 5 cases
- Combination Scenarios: 3 cases
- Data Edge Cases: 6 cases
- Navigation/Interaction: 5 cases
- UI State: 4 cases
- Permission/Security: 3 cases
- Year Code/Stage Matching: 3 cases
- Button States: 5 cases
- Recommendation Reasons: 4 cases
- Visual/Layout: 4 cases
- Topic List Display: 4 cases
- Skeleton Loading States: 2 cases
- Integration: 4 cases
- Cancel and Combine Lessons: 3 cases
- Performance: 3 cases

## Implementation Priority

**P0 (Critical)**:
- TC-000A through TC-000E (Wizard entry and feedback guard)
- TC-001 through TC-016 (Basic flows and active lesson scenarios)
- TC-018, TC-019 (Curriculum stage scenarios)
- TC-036 through TC-040 (Navigation and adding classes)

**P1 (Important)**:
- TC-022 through TC-026 (Topic completion edge cases)
- TC-027 through TC-029 (Combination scenarios)
- TC-030 through TC-035 (Data edge cases)

**P2 (Nice to Have)**:
- TC-041 through TC-047 (UI states and permissions)
- TC-048 through TC-055 (Year codes and button states)
- TC-056 through TC-070 (Visual, integration, performance)