import React from 'react';
import './index.css';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Specialties from './components/Specialties';
import Portfolio from './components/Portfolio';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="App">
      <Header />
      <main>
        <Hero />
        <About />
        <Specialties />
        <Portfolio />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;
