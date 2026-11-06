import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { Shell } from './layout/shell/shell';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Tickets } from './pages/tickets/tickets';
import { TicketForm } from './pages/tickets/ticket-form/ticket-form';
import { TicketDetail } from './pages/tickets/ticket-detail/ticket-detail';
import { Customers } from './pages/customers/customers';
import { CustomerForm } from './pages/customers/customer-form/customer-form';
import { CustomerDetail } from './pages/customers/customer-detail/customer-detail';
import { Users } from './pages/users/users';
import { UserForm } from './pages/users/user-form/user-form';
import { UserDetail } from './pages/users/user-detail/user-detail';

export const routes: Routes = [
  // Cognito redirects back to the root URL (?code=...), so the login page handles the callback.
  { path: '', component: Login, pathMatch: 'full', title: 'Sign in · SupportFlow' },
  { path: 'login', component: Login, title: 'Sign in · SupportFlow' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard, title: 'Dashboard · SupportFlow' },
      { path: 'tickets', component: Tickets, title: 'Tickets · SupportFlow' },
      { path: 'tickets/new', component: TicketForm, title: 'New ticket · SupportFlow' },
      { path: 'tickets/:id', component: TicketDetail, title: 'Ticket · SupportFlow' },
      { path: 'tickets/:id/edit', component: TicketForm, title: 'Edit ticket · SupportFlow' },
      { path: 'customers', component: Customers, title: 'Customers · SupportFlow' },
      { path: 'customers/new', component: CustomerForm, title: 'New customer · SupportFlow' },
      { path: 'customers/:id', component: CustomerDetail, title: 'Customer · SupportFlow' },
      { path: 'customers/:id/edit', component: CustomerForm, title: 'Edit customer · SupportFlow' },
      { path: 'users', component: Users, title: 'Users · SupportFlow' },
      { path: 'users/invite', component: UserForm, title: 'Invite user · SupportFlow' },
      { path: 'users/:id', component: UserDetail, title: 'User · SupportFlow' },
    ],
  },
  { path: '**', redirectTo: '' },
];
