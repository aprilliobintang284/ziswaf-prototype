import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { MailSim } from './components/MailSim'
import { DashboardLayout } from './components/layouts'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { ForgotPasswordPage, ResetPasswordPage } from './pages/Password'
import { FundraiserPage } from './pages/Fundraiser'
import { FundraiserEditPage } from './pages/FundraiserEdit'
import { ProgramPage } from './pages/Program'
import { ProgramFormPage } from './pages/ProgramForm'
import { TransaksiPage } from './pages/Transaksi'
import { PenarikanPage } from './pages/Penarikan'
import { PenarikanFormPage } from './pages/PenarikanForm'

function Root() {
  return (
    <ToastProvider>
      <Outlet />
      <MailSim />
      <span className="proto-tag">Prototype · data dummy</span>
    </ToastProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Navigate to="/masuk" replace /> },
      { path: '/masuk', element: <LoginPage /> },
      { path: '/daftar', element: <RegisterPage /> },
      { path: '/lupa-password', element: <ForgotPasswordPage /> },
      { path: '/atur-ulang-password', element: <ResetPasswordPage /> },
      {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="fundraiser" replace /> },
          { path: 'fundraiser', element: <FundraiserPage /> },
          { path: 'fundraiser/edit', element: <FundraiserEditPage /> },
          { path: 'program', element: <ProgramPage /> },
          { path: 'program/buat', element: <ProgramFormPage mode="create" /> },
          { path: 'program/:id/edit', element: <ProgramFormPage mode="edit" /> },
          { path: 'transaksi', element: <TransaksiPage /> },
          { path: 'penarikan', element: <PenarikanPage /> },
          { path: 'penarikan/ajukan', element: <PenarikanFormPage /> },
          { path: 'penarikan/:id/edit', element: <PenarikanFormPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/masuk" replace /> },
    ],
  },
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' })

export function App() {
  return <RouterProvider router={router} />
}
