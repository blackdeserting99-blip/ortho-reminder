"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-teal-700 text-white px-4 py-4 shadow-lg mb-6">
      <div className="flex flex-wrap items-center gap-3 md:gap-6">
        <div className="logo-text mr-auto text-white">Ortho Prime</div>

        <Link
          href="/"
          className="font-semibold hover:underline"
        >
          Dashboard
        </Link>

        <Link
          href="/patients"
          className="font-semibold hover:underline"
        >
          Patients
        </Link>

        <Link
          href="/finished-cases"
          className="font-semibold hover:underline"
        >
          Finished Cases
        </Link>

        <Link
          href="/archive"
          className="font-semibold hover:underline"
        >
          Archive
        </Link>

        <Link
          href="/add-patient"
          className="font-semibold hover:underline"
        >
          New Patient
        </Link>

        <Link
          href="/support"
          className="font-semibold hover:underline"
        >
          Support
        </Link>

      </div>
    </nav>
  );
}
