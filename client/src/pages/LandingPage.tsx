import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Cloud, Users, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import BrandLogo from '../components/BrandLogo';
import RequestAccessForm from '../components/RequestAccessForm';

const features = [
  {
    title: 'Multi-klubb og roller',
    description: 'Clerk-organisasjoner og rollestyring gir trygg tilganger for superadministratorer, klubbledere og medlemmer.',
    icon: Users,
  },
  {
    title: 'Betaling per klubb',
    description: 'Stripe og Backblaze holder styr på fakturaer og lagring så dere kun betaler for det dere bruker.',
    icon: ShieldCheck,
  },
  {
    title: 'Synkronisert lagring',
    description: 'Backblaze B2 og Supabase sørger for at kart og metadata er oppdatert på tvers av alle flater.',
    icon: Cloud,
  },
  {
    title: 'API og automatisering',
    description: 'Webhooker og API-logger gjør det enkelt å integrere Kartarkiv med klubbens eksisterende verktøy.',
    icon: Zap,
  },
];

const pricing = [
  {
    name: 'Basispakke',
    price: '990 kr / måned',
    description: 'Inkluderer 50 GB lagring, 5 admin-brukere og ubegrenset antall kart.',
    items: [
      'Invitasjonsbasert onboarding med støtte fra Kartarkiv-teamet',
      'Tilgang til admin-panel med oversikt, lagring og fakturaer',
      'Standard support via e-post og Slack',
    ],
  },
  {
    name: 'Pay-as-you-go',
    price: '1,20 kr per GB lagring',
    description: 'Automatisk volum-beregning og fakturering per klubb hver måned.',
    items: [
      'Backblaze B2-synk mot Supabase for sikre kopier',
      'Automatiske Stripe-fakturaer med oversikt i adminpanelet',
      'Detaljerte lagringsrapporter og API-logger',
    ],
  },
];

const LandingPage: React.FC = () => {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) {
      navigate('/app');
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="bg-white">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-600/90 to-brand-700 opacity-95"></div>
        <div className="relative">
          <div className="mx-auto max-w-7xl px-6 pt-8 pb-24 sm:pt-12 lg:px-8">
            <nav className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <BrandLogo size="sm" />
                <span className="text-lg font-semibold tracking-tight">Kartarkiv</span>
              </div>
              <div className="hidden sm:flex items-center space-x-6 text-sm">
                <Link to="/auth" className="font-medium hover:underline">Logg inn</Link>
                <a href="#request-access" className="inline-flex items-center space-x-1 font-semibold">
                  <span>Be om tilgang</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </nav>

            <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="inline-flex items-center space-x-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">
                  <span>Nyhet</span>
                  <span className="font-semibold text-white">Multi-klubb SaaS for orientering</span>
                </div>
                <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Samle kart, lagring og betaling for hele klubben i én løsning
                </h1>
                <p className="mt-6 text-lg text-white/80">
                  Kartarkiv er bygget for orienteringsklubber som trenger sikker deling, kontroll på lagringskostnader og sømløs
                  onboarding av medlemmer via invitasjon.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
                  <a
                    href="#request-access"
                    className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
                  >
                    Be om tilgang
                  </a>
                  <Link
                    to="/auth"
                    className="inline-flex items-center justify-center rounded-md border border-white/40 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-white/10"
                  >
                    Logg inn
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-white/10 blur-xl"></div>
                <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl">
                  <div className="bg-brandSurface px-6 py-4 border-b border-brand-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-full bg-brand-400"></span>
                      <span className="text-sm font-medium text-brand-700">Kartoversikt</span>
                    </div>
                    <span className="text-xs uppercase tracking-widest text-brand-600">Demo</span>
                  </div>
                  <div className="p-6 space-y-4 bg-white">
                    <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                      <p className="text-sm font-semibold text-brand-700">Per-klubb innsikt</p>
                      <p className="mt-2 text-sm text-gray-600">
                        Se lagring, opplastinger og fakturaer for hver klubb. Multi-tenancy med Supabase RLS holder data adskilt.
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-900">Automatisk lagringssynk</p>
                      <p className="mt-2 text-sm text-gray-600">
                        Backblaze-jobben oppdaterer Supabase hver natt slik at dere alltid har ferske tall før fakturering.
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-900">Invitasjoner via Clerk</p>
                      <p className="mt-2 text-sm text-gray-600">
                        Superadministratorer godkjenner klubber og sender invitasjoner direkte fra admin-panelet.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Alt klubben trenger for kartforvaltning</h2>
              <p className="mt-4 text-lg text-gray-600">
                Kartarkiv er utviklet sammen med klubber for å håndtere invitasjoner, lagring og betaling i én og samme plattform.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-brandSurface py-20">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {pricing.map((tier) => (
                <div key={tier.name} className="rounded-2xl border border-brand-100 bg-white p-8 shadow-md">
                  <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{tier.name}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{tier.price}</p>
                  <p className="mt-3 text-sm text-gray-600">{tier.description}</p>
                  <ul className="mt-6 space-y-3 text-sm text-gray-700">
                    {tier.items.map((item) => (
                      <li key={item} className="flex items-start space-x-3">
                        <CheckCircle2 className="mt-1 h-4 w-4 text-brand-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Invitasjonsdrevet onboarding</h2>
                <p className="text-lg text-gray-600">
                  Ingen åpne registreringer. Klubber søker om tilgang, superadministratorer vurderer behovet og Kartarkiv setter opp
                  Clerk-organisasjon, Stripe-kunde og Backblaze-prefiks automatisk ved godkjenning.
                </p>
                <p className="text-lg text-gray-600">
                  Hver klubb får sitt eget brand med logo, farger og egen fakturering – samtidig som data skilles med Supabase
                  row-level security.
                </p>
              </div>
              <RequestAccessForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-gray-600 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-3">
            <BrandLogo size="sm" />
            <div>
              <p className="font-semibold text-gray-900">Kartarkiv</p>
              <p>En SaaS-plattform fra Kartarkiv-teamet</p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <a href="mailto:hei@kartarkiv.co" className="hover:text-brand-600">hei@kartarkiv.co</a>
            <Link to="/privacy-policy" className="hover:text-brand-600">Personvern</Link>
            <Link to="/terms-of-service" className="hover:text-brand-600">Vilkår</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
