SaaS Application Task Management System Enhancement
Overview
This project enhances a subscription based SaaS application by introducing a complete task management system with workflow control, advanced filtering, deadline tracking, UI improvements, and activity logging. The system transforms projects into fully interactive and manageable workspaces.
Modules Implemented
Module 1 Task Management
Create update and delete tasks within projects
Assign tasks to team members
Add priority due date and status
Role based access control
Automatically set completed_at when task is marked as done
Module 2 Workflow Rules
Controlled task status transitions
todo to in_progress
in_progress to done or blocked
blocked to in_progress
Prevent invalid transitions
Admin and owner override support
Module 3 Advanced Filters and Saved Views
Filter tasks by status priority assignee due date and overdue
Combine multiple filters
Save and reuse filter configurations
Pagination support
Module 4 Deadline and Overdue Tracking
Detect overdue tasks automatically
Provide insights such as overdue tasks due today and due this week
Highlight deadlines in the user interface
Module 5 UI Enhancements
Table view with sortable columns and filters
Kanban view grouped by task status
Toggle between table and kanban views
Module 6 Task Activity History
Track task creation updates status changes reassignment and deletion
Store old and new values
Display activity timeline
Tech Stack
Backend FastAPI
ORM SQLAlchemy
Database MySQL
Authentication JWT
Payments Stripe
Migrations Alembic
Database Tables
tasks
saved_filters
task_activities
API Endpoints
Task Management
POST /projects/{id}/tasks
GET /projects/{id}/tasks
GET /tasks/{id}
PUT /tasks/{id}
DELETE /tasks/{id}
Workflow
PATCH /tasks/{id}/status
Filters
GET /tasks
POST /filters
GET /filters
DELETE /filters/{id}
GET /filters/{id}/apply
Deadlines
GET /tasks/overdue
GET /tasks/due-today
GET /tasks/due-week
Activity
GET /tasks/{id}/activities
Setup Instructions
Clone the repository
Create a virtual environment
Install dependencies
Configure .env file with required variables
Run database migrations using Alembic
Start the server using Uvicorn
Security
Sensitive data is stored using environment variables
.env venv and cache files are excluded using gitignore
Role based access is enforced
Deliverables Completed
Task model and migrations
CRUD APIs with validation
Workflow enforcement logic
Advanced filtering system
Deadline tracking features
UI enhancements
Activity logging system
Status
Project completed and ready for review

If you want, I can also make it shorter or format it exactly for submission portal.
