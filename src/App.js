import logo from './plotting_output.png';
import React, { useState } from 'react';
import './App.css';
import Amplify from "aws-amplify";
import awsExports from "./aws-exports";
import { withAuthenticator } from '@aws-amplify/ui-react'
import axios from 'axios';
import {
  XYPlot,
  XAxis,
  YAxis,
  HorizontalGridLines,
  VerticalGridLines,
  LineSeries,
  DecorativeAxis
} from 'react-vis';
import { scaleLinear } from 'd3-scale';

Amplify.configure(awsExports);

class App extends React.Component {
  state = {
    user: 'Amey Dhavle',
    modelName: "",
    modelBounds: [],
    ModelData : [
      {
        
        "var1": "0.4123327243506359",
        "var2": "0.8634365092241048",
        "var3": "1.4226168248876003",
        "var4": '2',
        "name": "Experiment 1"
      },
      {
        "name": "Experiment 2",
        "var1": "0.7995664879580107",
        "var2": "-0.0006440471789910251",
        "var3": "1.604951541903651",
        "var4": '4'
      }],
    resultBB: [],
    lastestResult: [],
    fvals: [],
    modelU: 0,
    modelL: 1,
    fVal: 0
  };
  Chart = (props) => {
    const dataArr = this.state.ModelData.map((d)=> {
        return {x: d.year + '/' + d.quarter, 
        y: parseFloat(d.count/1000)}
    });

    return (
        <XYPlot
            xType="ordinal"
            width={1000}
            height={500}>
            <VerticalGridLines />
            <HorizontalGridLines />
            <XAxis title="Period of time(year and quarter)" />
            <YAxis title="Number of pull requests (thousands)" />
                <LineSeries
                    data={dataArr}
                    style={{stroke: 'violet', strokeWidth: 3}}/>
        </XYPlot>
    );
}
  DEFAULT_DOMAIN = { min: Infinity, max: -Infinity };
  // begin by figuring out the domain of each of the columns
  
  domains = this.state.ModelData.reduce((res, row) => {
    Object.keys(row).forEach(key => {
      if (!res[key]) {
        res[key] = { ...this.DEFAULT_DOMAIN };
      }
      res[key] = {
        min: Math.min(res[key].min, row[key]),
        max: Math.max(res[key].max, row[key])
      };
    });
    return res;
  }, {});
  // use that to generate columns that map the data to a unit scale
  scales = Object.keys(this.domains).reduce((res, key) => {
    const domain = this.domains[key];
    res[key] = scaleLinear()
      .domain([domain.min, domain.max])
      .range([0, 1]);
    return res;
  }, {});

  // break each object into an array and rescale it
  mappedData = this.state.ModelData.map(row => {
    return Object.keys(row)
      .filter(key => key !== 'name')
      .map(key => ({
        x: key,
        y: this.scales[key](Number(row[key]))
      }));
  });

  vizualization = () => {
      return <XYPlot
      width={800}
      height={300}
      xType="ordinal"
      margin={this.MARGIN}
      className="parallel-coordinates-example"
    >
      {this.mappedData.map((series, index) => {
        return <LineSeries data={series} key={`series-${index}`} />;
      })}
      {this.mappedData[0].map((cell, index) => {
        return (
          <DecorativeAxis
            key={`${index}-axis`}
            axisStart={{ x: cell.x, y: 0 }}
            axisEnd={{ x: cell.x, y: 1 }}
            axisDomain={[this.domains[cell.x].min, this.domains[cell.x].max]}
          />
        );
      })}
    </XYPlot>
  }
  
  MARGIN = {
    left: 10,
    right: 10,
    top: 10,
    bottom: 10
  };
  

  addPairs = () => {
    var tmp = this.state.modelBounds
    var tmpBounds = new Array(Number.parseFloat(this.state.modelU), Number.parseFloat(this.state.modelL))
    tmp.push(tmpBounds)
    this.setState({
      modelBounds: tmp
    });
  };

  handleModelChange = () => e => {
    const { name, value } = e.target;
    this.setState({
      [name]: value
    });
  };

  createModel = () => {
    var opts = {
      "method": "create_model",
      "args": {
        "modeltag": "engine8",
        "bounds": this.state.modelBounds
      }
    }
    var self = this;
    axios.post('https://arfcjutdok.execute-api.us-east-1.amazonaws.com/dev', opts)
      .then(function (response) {
        self.setState({ modelName: response.data.modelname })
        document.getElementById("runModel").classList.remove('disabled')
        document.getElementById('btnAskModel').style.display = 'block'
      }
      )

  }

  askModel = () => {
    var opts = {
      "method": "ask_model",
      "args": {
        "modelname": this.state.modelName
      }
    }
    var tmp = this.state.resultBB
    var self = this;
    axios.post('https://arfcjutdok.execute-api.us-east-1.amazonaws.com/dev', opts)
      .then(function (response) {
        self.setState({
          lastestResult: response.data.xval
        })
        
        tmp.push(response.data.xval)
        self.setState({
          resultBB: tmp
        });
        document.getElementById('btnAskModel').style.display = 'none'
      }
      )
      
  };

  tellModel = () => {
    var tmp = this.state.resultBB;
    var fvaltmp = this.state.fvals
    var self = this;
    var viz =[]
    var tmpViz = {}
    var opts = {
      "method": "tell_model",
      "args": {
        "modelname": this.state.modelName,
        "xval": this.state.lastestResult,
        "fval": Number.parseFloat(this.state.fVal)
      }
    }
    axios.post('https://arfcjutdok.execute-api.us-east-1.amazonaws.com/dev', opts)
      .then(function (response) {
        tmp.push(response.data.modelname.updated_point.xval[0])
        fvaltmp.push(response.data.modelname.updated_point.fval)
        var uniquevalue = new Set(tmp)
        self.setState({
          resultBB: [...uniquevalue]
        });
        self.setState({
          fvals: fvaltmp
        })
        
        var myClasses = document.querySelectorAll('.form-control'),
          i = 0,
          l = myClasses.length;
        for (i; i < l; i++) {
          myClasses[i].style.display = 'none';
        }
        var myBtnClasses = document.querySelectorAll('.btn-success'),
          i = 0,
          l = myBtnClasses.length;
        for (i; i < l; i++) {
          myBtnClasses[i].style.display = 'none';
        }


        document.getElementById('viz').style.display = 'block'
        self.askModel()
      }).then(function(response){
        var names = []
        var viz = self.state.resultBB
        for(var i=0 ; i <self.state.resultBB[1].length; i++){
          names.push("var " + i)
        }
        var t1 =[]; 
        for(var k =0; k< self.state.resultBB.length; k++){
          var arr = self.state.resultBB[1],
          keys = names; 
          var x = self.arr2obj(arr,keys)
          t1.push(x)
        }
        self.setState({
          ModelData: [...t1]
        })
        console.log(self.state.ModelData)
        self.vizualization()
      }
      )
      
  };
  arr2obj(arr, keys)  {
    var obj = {}
    for (var i = 0, l = arr.length; i < l; i++) {
        obj[typeof keys === 'function' ? keys(i) : keys[i] || i] = arr[i];
    }
    return obj;
}  
  render() {
    return (
      <div id="exTab3" class="container">
        <ul class="nav nav-pills">
          <li class="nav-item">
            <a class="nav-link active" href="#3a" data-toggle="tab">Black Box Optimization</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#1a" data-toggle="tab">Create Model</a>
          </li>
          <li class="nav-item ">
            <a class="nav-link disabled" id="runModel" href="#2a" data-toggle="tab">Run Model</a>
          </li>
        </ul>
        <div class="tab-content clearfix">
          <div class="tab-pane" id="1a">
            <div class="row">
              <div class="col-7">
                <div class="input-group mb-3">
                  <div class="input-group-prepend">
                    <span class="input-group-text" id="basic-addon3">Lower bound</span>
                  </div>
                  <input type="text" class="form-control" name="modelU" aria-describedby="basic-addon3" value={this.state.modelU} onChange={this.handleModelChange()} />
                  <div class="input-group-prepend">
                    <span class="input-group-text" id="basic-addon3">Upper bound</span>
                  </div>
                  <input type="text" class="form-control" name="modelL" aria-describedby="basic-addon3" value={this.state.modelL} onChange={this.handleModelChange()} />
                  <button type="button" onClick={this.addPairs} className="btn btn-danger">Add Pairs for Model</button>
                </div>
                <button type="button" onClick={this.createModel} className="btn btn-warning">Create Model</button>
              </div>
              <div class="col-5">
                <div class="card" style={{ width: "30rem" }}>
                  <div class="card-header">
                    Model
                  </div>
                  <div class="card-body">
                    <h6 class="card-title">Name <span style={{ color: '#f99829' }}>{this.state.modelName}</span> </h6>
                    <p class="card-text">

                      {this.state.modelBounds.map((items, index) => {
                        return (
                          <p>[{items.toString().split('')}]</p>
                        );
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="tab-pane" id="2a">
            <div class="row">
              <table className="table table-bordered table-hover table-justified table-striped">
                <tbody>
                  {
                    this.state.resultBB.map((items, index) => {
                      if (index > 0 && JSON.stringify(this.state.resultBB[index]) == JSON.stringify(this.state.resultBB[index - 1])) {
                        console.log('skipping duplicate row')
                      } else {
                        return (
                          <tr>
                            {items.map((subItems, sIndex) => {
                              return <td> {subItems} </td>;
                            })}

                            <td>{this.state.fvals[index / 2]}</td>
                            <td><input type="text" id="fxVal" class="form-control" name="fVal" aria-describedby="basic-addon3" value={this.state.fVal} onChange={this.handleModelChange()} /></td>
                            <td>
                              <div className="btn-group" role="group" aria-label="Basic example">
                                <button type="button" id="btnTellModel" onClick={this.tellModel} className="btn btn-success">Tell Model</button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    })}
                </tbody>
              </table>
              <button type="button" id="btnAskModel" onClick={this.askModel} className="btn btn-primary">Ask Model</button>
            </div>
            <div class="row" id="viz" style={{ display: 'none' }}>
            <this.Chart></this.Chart>
            </div>
            
          </div>
          <div class="tab-pane active" id="3a">
            <div class="jumbotron jumbotron-fluid">
              <div class="container">
                <strong>Welcome </strong> <span style={{ color: '#f99829' }}>{this.state.user.firstName}</span>!
                <h2 class="display-6">What is Black Box optimization?</h2>
                <div class="row">
                  <div class="col-6">
                    <img src={logo} width="100%" />
                  </div>
                  <div class="col-6">
                    <p>
                      "Black Box" optimization refers to a problem setup in which an optimization algorithm is supposed to optimize (e.g., minimize) an objective function through a so-called black-box interface: the algorithm may query the value f(x) for a point x, but it does not obtain gradient information, and in particular it cannot make any assumptions on the analytic form of f (e.g., being linear or quadratic).
                      We think of such an objective function as being wrapped in a black-box. </p>
                  </div>
                </div>
                <div class="row">
                  <br />
                  <p class="lead text-primary"><i>The goal of optimization is to find an as good as possible value f(x) within a predefined time, often defined by the number of available queries to the black box.</i></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default withAuthenticator(App)