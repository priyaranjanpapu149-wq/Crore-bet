import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Placeholder from './pages/Placeholder';
import Referrals from './pages/Referrals';
import UserList from './pages/Users/UserList';
import UserView from './pages/Users/UserView';
import UnapprovedUsers from './pages/Users/UnapprovedUsers';
import Deposits from './pages/Wallet/Deposits';
import AutoResult from './pages/Games/AutoResult';
import OcCutting from './pages/Games/OcCutting';
import BettingReport from './pages/Reports/BettingReport';
import BettingReportDetail from './pages/Reports/BettingReportDetail';
import GameProviders from './pages/Games/GameProviders';
import GameRates from './pages/Games/GameRates';
import GameResult from './pages/Games/GameResult';
import GameResultOld from './pages/Games/GameResultOld';
import GameResultDeclare from './pages/Games/GameResultDeclare';
import WinnerPrediction from './pages/Reports/WinnerPrediction';
import ProfitLoss from './pages/Reports/ProfitLoss';
import WinningDetails from './pages/Reports/WinningDetails';
import BetFilter from './pages/Reports/BetFilter';
import SellReport from './pages/Reports/SellReport';
import BidHistory from './pages/Bids/BidHistory';
import WithdrawReport from './pages/Reports/WithdrawReport';
import Transactions from './pages/Wallet/Transactions';
import DepositBonus from './pages/Wallet/DepositBonus';
import Withdrawals from './pages/Wallet/Withdrawals';
import AddPoints from './pages/Wallet/AddPoints';
import BidRevert from './pages/Wallet/BidRevert';
import ChangePassword from './pages/Settings/ChangePassword';
import MainSettings from './pages/Settings/MainSettings';
import Contact from './pages/Settings/Contact';
import SliderPage from './pages/Settings/Slider';
import NoticeEditor from './pages/Notice/NoticeEditor';
import SendNotification from './pages/Notice/Send';
import SingleDigit from './pages/Numbers/SingleDigit';
import JodiDigit from './pages/Numbers/JodiDigit';
import SinglePana from './pages/Numbers/SinglePana';
import DoublePana from './pages/Numbers/DoublePana';
import TriplePana from './pages/Numbers/TriplePana';
import HalfSangam from './pages/Numbers/HalfSangam';
import FullSangam from './pages/Numbers/FullSangam';
import Personal from './pages/Numbers/Personal';
import TwoFactorSetup from './pages/Settings/TwoFactorSetup ';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserList />} />
          <Route path="/users/unapproved" element={<UnapprovedUsers />} />
          <Route path="/users/:id" element={<UserView />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="*" element={<Placeholder />} />
<Route path="/deposits" element={<Deposits />} />
<Route path="/auto-result" element={<AutoResult />} />
<Route path="/oc-cutting" element={<OcCutting />} />
<Route path="/reports/betting/:marketName/:session" element={<BettingReportDetail />} />
<Route path="/reports/betting" element={<BettingReport />} />
<Route path="/games/providers" element={<GameProviders />} />
<Route path="/games/rates" element={<GameRates />} />
<Route path="/games/result/declare" element={<GameResultDeclare />} />
<Route path="/games/result" element={<GameResult />} />
<Route path="/games/result-old" element={<GameResultOld />} />
<Route path="/reports/prediction" element={<WinnerPrediction />} />
<Route path="/reports/profit-loss" element={<ProfitLoss />} />
<Route path="/reports/winners" element={<WinningDetails />} />
<Route path="/reports/bet-filter" element={<BetFilter />} />
<Route path="/reports/sell" element={<SellReport />} />
<Route path="/bids" element={<BidHistory />} />
<Route path="/reports/withdraw" element={<WithdrawReport />} />
<Route path="/wallet/transactions" element={<Transactions />} />
<Route path="/wallet/bonus" element={<DepositBonus />} />
<Route path="/wallet/withdrawals" element={<Withdrawals />} />
<Route path="/wallet/add-points" element={<AddPoints />} />
<Route path="/wallet/bid-revert" element={<BidRevert />} />
<Route path="/settings/password" element={<ChangePassword />} />
<Route path="/settings/main" element={<MainSettings />} />
<Route path="/settings/contact" element={<Contact />} />
<Route path="/settings/slider" element={<SliderPage />} />
<Route path="/notice" element={<NoticeEditor />} />
<Route path="/notice/send" element={<SendNotification />} />
<Route path="/numbers/single" element={<SingleDigit />} />
<Route path="/numbers/jodi" element={<JodiDigit />} />
<Route path="/numbers/single-pana" element={<SinglePana />} />
<Route path="/numbers/double-pana" element={<DoublePana />} />
<Route path="/numbers/triple-pana" element={<TriplePana />} />
<Route path="/numbers/half-sangam" element={<HalfSangam />} />
<Route path="/numbers/full-sangam" element={<FullSangam />} />
<Route path="/numbers/personal" element={<Personal />} />
<Route path="/settings/2fa" element={<TwoFactorSetup />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}