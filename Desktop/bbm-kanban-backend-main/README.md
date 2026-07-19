```markdown
# BBM – Kanban API Backend

A Django REST Framework backend for a modern Kanban board application.

## Features

- Custom user model (email login)
- Full CRUD for boards, tasks, and comments
- Permission system for owners, members, and admins (BBM internal whitelist)
- RESTful API design, resource-oriented endpoints
- Token-based authentication (DRF TokenAuth)
- Admin interface for all core objects
- Modern Python code style (PEP8, ≤14 lines/method, all code documented)

---

## Quickstart (Local Setup)

### 1. **Clone the Repository**
Open your terminal (PowerShell for Windows, Terminal for Mac/Linux) and run:
```bash
git clone https://github.com/leo-rullani/kanban.git
cd kanban
````

### 2. **Create & Activate Virtual Environment**

#### **Windows (CMD or PowerShell):**

```bat
python -m venv env
env\Scripts\activate
```

#### **Mac/Linux:**

```bash
python3 -m venv env
source env/bin/activate
```

### 3. **Install Dependencies**

```bash
pip install -r requirements.txt
```

### 4. **Database Setup (SQLite)**

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. **Create Superuser (for admin interface)**

```bash
python manage.py createsuperuser
```

### 6. **Run Development Server**

```bash
python manage.py runserver
```

Visit [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/) to access the Django admin interface.

---

## Project Structure

```
kanban/                 # Project root (manage.py, requirements.txt, README.md, etc.)
core/                   # Main project settings, urls, wsgi, asgi, etc.
kanban_app/             # Kanban logic (models, views, api/, admin, tests)
auth_app/               # Custom user model, registration, login, api/
```

---

## Notes

* No database files are included in the repository.
* After cloning, always run migrations!
* The backend is decoupled: frontend is NOT part of this repo.
* All environment variables, secrets, and `.env` files should be handled securely and are not included.
* All code is PEP8-compliant and documented.
* See [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/) for secure production setup.

---

## License

[MIT](https://opensource.org/licenses/MIT)
