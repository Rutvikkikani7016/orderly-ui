import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthLayout from '../../components/AuthLayout.jsx';
import FormField from '../../components/FormField.jsx';
import { registerCompany } from '../../api/auth.js';
import { useAuth } from '../../context/AuthContext.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z]{1}[A-Z\d]{1}$/;
const PHONE_RE = /^(?:\+91)?\d{10}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const initialForm = {
  companyName: '',
  companyEmail: '',
  companyPhone: '',
  gstin: '',
  businessType: '',
  businessAddress: '',
  fullName: '',
  email: '',
  mobile: '',
  password: '',
};

export default function Register() {
  const navigate = useNavigate();
  const { setUser, setCompany, setIsAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validateStep1() {
    const next = {};

    if (!form.companyName.trim() || form.companyName.trim().length < 2) {
      next.companyName = 'Enter your company name';
    }
    if (form.companyEmail && !EMAIL_RE.test(form.companyEmail.trim())) {
      next.companyEmail = 'Enter a valid company email';
    }
    if (form.companyPhone && !PHONE_RE.test(form.companyPhone.trim())) {
      next.companyPhone = 'Enter a valid 10-digit company phone';
    }
    if (form.gstin && !GSTIN_RE.test(form.gstin.trim().toUpperCase())) {
      next.gstin = 'That GSTIN doesn\u2019t look right';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep2() {
    const next = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      next.fullName = 'Enter your full name';
    }
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) {
      next.email = 'Enter a valid email';
    }
    if (form.mobile && !PHONE_RE.test(form.mobile.trim())) {
      next.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (!PASSWORD_RE.test(form.password)) {
      next.password = 'At least 8 characters, with a letter and a number';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNextStep(e) {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  }

  function handlePrevStep() {
    setErrors({});
    setStep(1);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateStep2()) return;

    setSubmitting(true);
    try {
      const { user, company, token } = await registerCompany({
        companyName: form.companyName.trim(),
        companyEmail: form.companyEmail.trim().toLowerCase() || undefined,
        companyPhone: form.companyPhone.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
        businessType: form.businessType.trim() || undefined,
        businessAddress: form.businessAddress.trim() || undefined,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim() || undefined,
        password: form.password,
      });

      localStorage.setItem('orderly_token', token);
      localStorage.setItem('orderly_company', JSON.stringify(company));
      localStorage.setItem('orderly_user', JSON.stringify(user));

      setUser(user);
      setCompany(company);
      setIsAuthenticated(true);

      toast.success('Account created');
      navigate('/onboarding');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Couldn\u2019t create your account. Try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="max-w-sm mx-auto">
        <h1 className="text-lg font-medium mb-2">Create your account</h1>

        {/* Wizard Stepper Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
            <span className={step === 1 ? 'text-accent font-semibold' : 'text-gray-400'}>
              1. Company details
            </span>
            <span className={step === 2 ? 'text-accent font-semibold' : 'text-gray-400'}>
              2. Personal details
            </span>
          </div>
          <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-300 ease-in-out"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleNextStep} noValidate>
            <p className="text-xs text-gray-400 mb-3">Step 1 of 2: Company details</p>
            <div className="space-y-4 mb-6">
              <FormField
                label="Company name"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="Acme Apparel Pvt Ltd"
                error={errors.companyName}
              />
              <FormField
                label="Company email"
                name="companyEmail"
                type="email"
                value={form.companyEmail}
                onChange={handleChange}
                placeholder="info@acme.com"
                error={errors.companyEmail}
                optional
              />
              <FormField
                label="Company phone"
                name="companyPhone"
                type="tel"
                value={form.companyPhone}
                onChange={handleChange}
                placeholder="9876543210"
                error={errors.companyPhone}
                optional
              />
              <FormField
                label="GSTIN"
                name="gstin"
                value={form.gstin}
                onChange={handleChange}
                placeholder="22AAAAA0000A1Z5"
                error={errors.gstin}
                optional
              />
              <FormField
                label="Business type"
                name="businessType"
                value={form.businessType}
                onChange={handleChange}
                placeholder="e.g. Retail, Wholesale, Apparel"
                error={errors.businessType}
                optional
              />
              <FormField
                label="Business address"
                name="businessAddress"
                value={form.businessAddress}
                onChange={handleChange}
                placeholder="Full office or warehouse address"
                error={errors.businessAddress}
                optional
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-md bg-ink text-white text-sm font-medium hover:bg-black transition-colors"
            >
              Next: Personal details &rarr;
            </button>

            <p className="text-sm text-gray-500 text-center mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-accent">
                Sign in
              </Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} noValidate>
            <p className="text-xs text-gray-400 mb-3">Step 2 of 2: Owner / Personal details</p>
            <div className="space-y-4 mb-6">
              <FormField
                label="Full name"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Priya Sharma"
                error={errors.fullName}
              />
              <FormField
                label="Personal email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="name@company.com"
                error={errors.email}
              />
              <FormField
                label="Mobile number"
                name="mobile"
                type="tel"
                value={form.mobile}
                onChange={handleChange}
                placeholder="9876543210"
                error={errors.mobile}
                optional
              />
              <FormField
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                error={errors.password}
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-1/3 h-10 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-2/3 h-10 rounded-md bg-ink text-white text-sm font-medium disabled:opacity-60 hover:bg-black transition-colors"
              >
                {submitting ? 'Creating account\u2026' : 'Create account'}
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-accent">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
