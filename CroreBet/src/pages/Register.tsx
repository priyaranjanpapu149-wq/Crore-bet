import { useSearchParams } from 'react-router-dom';

export default function Register() {
  const [params] = useSearchParams();
  const code = (params.get('ref') || '').trim().toUpperCase().slice(0, 50);
  const download = import.meta.env.VITE_APP_DOWNLOAD_URL || 'https://crorebetapp.com/apk/crorebetapp.apk';
  return <div className="mx-auto max-w-xl px-6 py-16 text-emerald-950">
    <h1 className="text-3xl font-bold">Join Crorebet</h1>
    <p className="mt-4">Download the app and register with your mobile number.</p>
    {code && <p className="mt-4">Enter this referral code during registration: <strong className="select-all">{code}</strong></p>}
    <a className="mt-6 inline-block rounded-lg bg-emerald-900 px-5 py-3 font-semibold text-white" href={download}>Download the app</a>
  </div>;
}
