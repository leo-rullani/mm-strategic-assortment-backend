# MM Flow – Strategic Assortment

![MM Flow logo](assets/icons/mm-flow-logo-dark.svg)

MM Flow is the MediaMarkt-oriented redesign of the existing Kanban application. It supports strategic assortment collaboration for CH and AT while preserving the original frontend behaviour and Django REST API integration.

## What stayed unchanged

- Authentication and registration
- Dashboard data and charts
- Board creation, editing, membership and deletion
- Four-stage task flow: To-do, In progress, Review and Done
- Assignee, reviewer, due date and priority handling
- Task comments and activity
- Requests view
- Existing board templates and PDF export
- API endpoints and local-storage authentication keys

## Visual system

The new presentation layer is defined in `shared/css/mm_theme.css` and is loaded after the existing stylesheets. This keeps the redesign separate from the application logic.

- Graphite and off-white surfaces
- MediaMarkt-inspired red for primary actions
- Independent colours for workflow status and priority
- New MM Flow mark, wordmark and print logo
- Light card-based dashboard and Kanban workspace
- Redesigned form sheets, input fields, dropdowns and dialogs
- Responsive desktop, tablet and mobile rules

## Run locally

1. Start the existing Django backend.
2. Open the frontend directory in Visual Studio Code.
3. Run `index.html` with Live Server or another static web server.
4. Sign in with an existing backend account.

No frontend build step or framework is required.

## Structure

```text
assets/icons/              MM Flow logos and existing UI icons
pages/auth/                Login and registration
pages/dashboard/           Dashboard and charts
pages/boards/              Board overview and board settings
pages/board/               Kanban board, task dialogs and PDF export
pages/requests/            Requests overview
shared/css/mm_theme.css    MM Flow presentation layer
shared/js/                 Existing API, auth and UI helpers
```

## Backend

The frontend continues to use the existing Django REST Framework backend. The redesign does not require a database migration or API contract change.
