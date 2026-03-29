import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import CountrySelector from './CountrySelector';
import toast from 'react-hot-toast';

interface SignupFormValues {
  name: string;
  email: string;
  password: string;
  country: string;
}

const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const validate = (values: SignupFormValues) => {
    const errors: Partial<Record<keyof SignupFormValues, string>> = {};

    if (!values.name || values.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = 'Invalid email format';
    }

    if (!values.password || values.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!values.country) {
      errors.country = 'Please select a country';
    }

    return errors;
  };

  const { values, errors, handleChange, handleSubmit, setFieldValue } = useForm<SignupFormValues>(
    { name: '', email: '', password: '', country: '' },
    validate
  );

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    try {
      await signup(data);
      toast.success('Signup successful! Redirecting...');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Signup failed. Please try again.');
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="signup-form">
      <div className="form-group">
        <label htmlFor="name">Full Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={values.name}
          onChange={handleChange}
          placeholder="Enter your full name"
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={values.email}
          onChange={handleChange}
          placeholder="Enter your email"
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={values.password}
          onChange={handleChange}
          placeholder="Enter a strong password"
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="country">Country</label>
        <CountrySelector
          value={values.country}
          onChange={(country) => setFieldValue('country', country)}
        />
        {errors.country && <span className="error">{errors.country}</span>}
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? 'Creating Account...' : 'Sign Up'}
      </button>
    </form>
  );
};

export default SignupForm;