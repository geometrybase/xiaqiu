import {withSize} from 'react-sizeme';
import ABG from './11-Final';
import './App.css';


const App = function ({size: {width, height}}) {
  console.log(width, height)
  return (
    <div className="App">
      <ABG
        width={width / 4}
        height={height / 4}
      />
    </div>
  );
}

export default withSize({monitorHeight: true})(App);
