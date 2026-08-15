# CourseFlow

**Your academic progress, all in one place.**

CPAN 324 Project — BATmen
**Team Members:** Alexander Watson, Ibrahim Hagi, Tsering Lama, and Brandon Pagani Lozano

## Overview

CourseFlow is a full-stack academic productivity and course management application designed to help students and instructors organize coursework, track assignments, monitor progress, communicate, and manage course information from one centralized platform.

The application supports separate **Student**, **Teacher**, and **Administrator** roles, with role-specific features and dashboards.

## Features

### Student Features

Students can:

* Create an account and securely log in.
* Join courses using unique course join codes.
* View enrolled courses.
* View assignments distributed by instructors.
* Create personal assignments.
* Mark assignments as complete or incomplete.
* Track assignment completion and course progress.
* View GPA and academic performance analytics.
* View upcoming and urgent assignments.
* View course announcements.
* Participate in persistent course-specific chat rooms.
* View previous chat messages after refreshing or returning to the application.

Students who join a course after assignments have already been distributed automatically receive the applicable existing course assignments.

### Teacher Features

Teachers can:

* Create and manage courses.
* Generate unique course join codes.
* View student enrollment counts.
* Distribute an assignment to an entire course at once.
* Assign due dates and assignment weights.
* View course-wide assignments as grouped distributions.
* Track how many students have completed or still have pending assignments.
* Delete an entire course-wide assignment distribution.
* Post course announcements.
* Communicate with enrolled students through persistent course chat.
* Use a dedicated teacher dashboard showing:

  * Courses taught
  * Unique enrolled students
  * Active assignments
  * Overall assignment completion
  * Course-level completion
  * Upcoming assignments
  * Assignments requiring attention

### Administrator Features

Administrators can:

* View registered users.
* Promote students to teachers.
* Demote eligible teachers to students.
* Manage courses and assignments with administrator authorization.
* Access protected user-management functionality.

Teacher demotion is blocked while the teacher owns courses to prevent orphaned course records.

## Assignment Management

CourseFlow uses independent assignment records for each enrolled student.

When a teacher distributes an assignment to a course:

1. CourseFlow identifies all currently enrolled students.
2. Each student receives an independent assignment record.
3. Students can complete their assignment without affecting another student's status.
4. The teacher sees the distribution as a single grouped assignment with completion statistics.
5. Students who join the course later receive applicable existing course-wide assignments automatically.

This allows CourseFlow to provide individual student tracking while maintaining a clean teacher assignment-management experience.

## Course Chat

Each course has its own authorized chat room.

Course chat includes:

* Course-specific message isolation.
* Student and teacher sender identification.
* Role labels for message senders.
* MongoDB-backed message persistence.
* Previous message history after refresh.
* Automatic Socket.IO room rejoining after reconnecting.
* Server-side course authorization.
* Protection against client-supplied sender spoofing.

Only authorized members of a course can access its messages.

## Security

CourseFlow includes several authorization and security controls:

* JWT-based authentication.
* Database-authoritative role verification.
* Student, teacher, and administrator authorization.
* Student-only public registration.
* Course ownership and enrollment checks.
* Protected administrator routes.
* Password-field redaction from request logs.
* Input validation.
* Course-specific Socket.IO authorization.
* Server-controlled chat sender identities.
* Protection against unauthorized assignment and announcement access.

Public registration always creates a student account. Teacher access is granted through administrator promotion.

## Technology Stack

### Frontend

* React
* Vite
* React Router
* Socket.IO Client
* CSS

### Backend

* Node.js
* Express
* Socket.IO
* JWT Authentication

### Database

* MongoDB
* Mongoose

### Deployment

* Vercel — frontend
* Render — backend
* MongoDB Atlas — production database
* GitHub Actions — CI/CD

## Setup

### Prerequisites

Node.js `^20.19.0` or `>=22.12.0` is required by Vite 8.

Check your installed version:

```bash
node -v
```

If Node.js is upgraded after dependencies have already been installed, remove `node_modules` and run `npm install` again to ensure the correct platform-specific dependencies are installed.

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure the following environment variables:

```env
PORT=8001
MONGODB_URI=
JWT_SECRET=
EMAIL_USER=
EMAIL_PASS=
VITE_API_URL=
```

`EMAIL_PASS` should use a Gmail App Password rather than the account's normal password.

For local development, `VITE_API_URL` can remain unset and defaults to the local backend.

## Running Locally

The frontend and backend run as separate processes.

### Frontend

```bash
npm run dev
```

### Backend

```bash
node server/index.js
```

The default backend port is `8001`.

## Testing

Run the automated test suite:

```bash
npm test
```

Run ESLint:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

The final project test suite contains **62 automated tests** covering major authentication, authorization, course, assignment, analytics, announcement, user-management, and Socket.IO functionality.

## CI/CD

The repository is the canonical source for both frontend and backend deployments.

Every push or pull request to `main` runs the project's GitHub Actions workflow, including:

* Automated tests
* ESLint
* Production build

### Frontend Deployment

The React frontend is deployed to **Vercel** through its GitHub integration.

Vercel automatically builds and deploys the frontend when changes are merged into the configured production branch.

Set:

```env
VITE_API_URL=<Render backend URL>
```

in the Vercel project's environment variables.

### Backend Deployment

The Express and Socket.IO backend is deployed to **Render**.

Render requires:

```env
MONGODB_URI=
JWT_SECRET=
EMAIL_USER=
EMAIL_PASS=
```

The GitHub Actions deployment workflow uses the repository secret:

```text
RENDER_DEPLOY_HOOK_URL
```

to trigger backend deployments after changes are pushed to `main`.

## Project Architecture

CourseFlow separates the application into:

* React pages and reusable UI components.
* Shared authentication, course, assignment, and Socket.IO contexts.
* Express controllers and routers.
* Mongoose data models.
* Authentication and authorization middleware.
* Course and role access utilities.
* Analytics services for student and teacher dashboards.

The frontend communicates with the Express API for persistent application data while Socket.IO provides real-time course communication.

## Current Status

CourseFlow is feature complete for the CPAN 324 project scope.

The final version includes role-based course management, assignment distribution and completion tracking, student and teacher dashboards, announcements, persistent course chat, administrator user management, automated testing, and cloud deployment.

### Final Verification

* **62/62 automated tests passing**
* **ESLint passing**
* **Production build passing**
* Student workflow manually tested
* Teacher workflow manually tested
* Administrator workflow manually tested
* Vercel frontend deployment verified
* Render backend integration verified
