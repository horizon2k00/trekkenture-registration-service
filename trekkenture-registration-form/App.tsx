import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TrekkentureForm } from './components/Form/TrekkentureForm';

export default function App() {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-surface">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center sm:text-left border-b border-slate-200 pb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Trekkenture Registration</h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl">
            Secure your spot for the upcoming adventure. Please complete all sections below.
          </p>
        </header>

        <Routes>
          {/* Capture tripName parameter from URL */}
          <Route path="/:tripName" element={<TrekkentureForm />} />
          
          {/* Default fallback if no trip name provided */}
          <Route path="/" element={<Navigate to="/GeneralTrip" replace />} />
        </Routes>
        
        <footer className="mt-16 text-center text-sm text-slate-400 pb-4">
          &copy; {new Date().getFullYear()} Trekkenture. All rights reserved.
        </footer>
      </div>
    </div>
  );
}