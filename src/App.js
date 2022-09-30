import {withSize} from 'react-sizeme';
import AnimatedBackground from './AnimatedBackground';
import './App.css';


const App = function ({size: {width, height}}) {
  console.log(width, height)
  return (
    <div className="App">
      <AnimatedBackground
        width={width / 4}
        height={height / 4}
        onClick={() => {
        }}
      />
    </div>
  );
}

export default withSize({monitorHeight: true})(App);
