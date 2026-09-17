import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadHub from './pages/LeadHub';
import Customers from './pages/Customers';
import Users from './pages/Users';
import Profile from './pages/Profile';
import SignaturePhoto from './pages/SignaturePhoto';
import Login from './pages/Login';
import MasterDataView from './pages/MasterDataView';
import BankDetails from './pages/BankDetails';
import LeadStatus from './pages/LeadStatus';
import TemplateManagement from './pages/TemplateManagement';
import Report from './pages/Report';
import Reminders from './pages/Reminders';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <div className="wrapper py-4">
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 ">
          {children}
        </main>
      </div>
    </div>
  );
};

// Admin-only route — redirects CRE / non-admin employees back to dashboard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <div className="wrapper py-4">
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Manager route — allows ADMIN and BUSINESS_HEAD
const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN' && user.role !== 'BUSINESS_HEAD') return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <div className="wrapper py-4">
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
          <Route path="/leadhub" element={<ManagerRoute><LeadHub /></ManagerRoute>} />
          <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
          <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/signature-photos" element={<AdminRoute><SignaturePhoto /></AdminRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
          
          {/* Master Data Routes — ADMIN ONLY */}
          <Route path="/master/bank-details" element={<AdminRoute><BankDetails /></AdminRoute>} />
          <Route path="/master/lead-status" element={<AdminRoute><LeadStatus /></AdminRoute>} />
          <Route path="/master/stages" element={<AdminRoute><MasterDataView title="Stages" type="stage" apiKey="stages" /></AdminRoute>} />
          <Route path="/master/source" element={<AdminRoute><MasterDataView title="Source" type="source" apiKey="sources" /></AdminRoute>} />
          <Route path="/master/split-up" element={<AdminRoute><MasterDataView title="Split Up" type="splitUp" apiKey="splitUps" /></AdminRoute>} />
          <Route path="/master/activity" element={<AdminRoute><MasterDataView title="Activity Types" type="activityType" apiKey="activityTypes" /></AdminRoute>} />
          <Route path="/master/salutation" element={<AdminRoute><MasterDataView title="Salutation" type="salutation" apiKey="salutations" /></AdminRoute>} />
          <Route path="/master/lead-tag" element={<AdminRoute><MasterDataView title="Lead Tags" type="leadTag" apiKey="leadTags" /></AdminRoute>} />
          <Route path="/master/showroom" element={<AdminRoute><MasterDataView title="Showroom" type="showroom" apiKey="showrooms" /></AdminRoute>} />
          <Route path="/master/scope-of-work" element={<AdminRoute><MasterDataView title="Scope of Work" type="scopeOfWork" apiKey="scopeOfWorks" /></AdminRoute>} />
          <Route path="/master/vendor-source" element={<AdminRoute><MasterDataView title="Vendor Source" type="vendorSource" apiKey="vendorSources" /></AdminRoute>} />
          <Route path="/master/payment-mode" element={<AdminRoute><MasterDataView title="Payment Mode" type="paymentMode" apiKey="paymentModes" /></AdminRoute>} />
          <Route path="/master/production-hold" element={<AdminRoute><MasterDataView title="Production Hold" type="productionHold" apiKey="productionHolds" /></AdminRoute>} />
          <Route path="/master/work-notification" element={<AdminRoute><MasterDataView title="Work Notification" type="workNotification" apiKey="workNotifications" /></AdminRoute>} />
          <Route path="/master/project" element={<AdminRoute><MasterDataView title="Projects" type="project" apiKey="projects" /></AdminRoute>} />
          <Route path="/master/brand" element={<AdminRoute><MasterDataView title="Brands" type="brand" apiKey="brands" /></AdminRoute>} />
          <Route path="/master/sms-template" element={<AdminRoute><TemplateManagement title="SMS Templates" type="smsTemplate" /></AdminRoute>} />
          <Route path="/master/email-template" element={<AdminRoute><TemplateManagement title="Email Templates" type="emailTemplate" /></AdminRoute>} />
          
          <Route path="*" element={<ProtectedRoute><div className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest bg-white border border-gray-100 shadow-sm mt-10">Module Under Construction</div></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
