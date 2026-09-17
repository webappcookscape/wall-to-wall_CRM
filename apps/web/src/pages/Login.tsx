
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const landingImage = '/assets/logos/wall2wall_crm.png';

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTraditionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Username and password are required.');
      return;
    }

    try {
      setErrorMsg(null);
      await login(username, password);
      navigate('/');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Invalid username/email or password.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setErrorMsg(null);
      if (credentialResponse.credential) {
        await login(credentialResponse.credential, undefined, true);
        navigate('/');
      }
    } catch (error: any) {
      setErrorMsg(error?.message || 'Google Login failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden overflow-y-auto w-full bg-[#f5f6f8] font-sans">
      {/* Background Section */}
      <div className="hidden lg:flex lg:w-2/3 items-center justify-center overflow-hidden shadow-inner">
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          <img
            src={landingImage}
            alt="Wall to Wall landing"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Login Form Section */}
      <div className="w-full lg:w-1/3 flex flex-col justify-center overflow-hidden bg-white px-6 py-6 lg:px-8 lg:py-6 relative shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.08)] border border-gray-100">

            <h4 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Login to CRM</h4>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleTraditionalLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login_string">
                  Username or Email
                </label>
                <input
                  type="text"
                  id="login_string"
                  name="login_string"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login_pass">
                  Password
                </label>
                <input
                  type="password"
                  id="login_pass"
                  name="login_pass"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1e88e5] text-white font-bold py-2.5 px-4 rounded-md hover:bg-[#1565c0] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-70 flex justify-center items-center"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Log me in'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 flex items-center justify-between">
              <span className="border-b w-1/5 lg:w-1/4 border-gray-300"></span>
              <span className="text-xs text-center text-gray-500 uppercase font-semibold">Or</span>
              <span className="border-b w-1/5 lg:w-1/4 border-gray-300"></span>
            </div>

            <div className="mt-6 flex justify-center min-h-[44px]">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErrorMsg('Google Login Failed')}
                shape="rectangular"
                theme="outline"
                text="continue_with"
              />
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Can't access your account? <a href="#" className="text-gray-900 font-semibold hover:underline ml-1">Reset Password</a>
              </p>
            </div>
          </div>

          <div className="mt-5 pb-1 text-center">
            <p className="text-sm text-gray-400">2026 &copy; CRM COOKSCAPE. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
