import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './login';
import Dashboard from './page';
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App
