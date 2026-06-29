import Plotly from 'plotly.js-basic-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import type { SimulationResult } from '../types/simulation';

type ReflectanceChartProps = {
  result: SimulationResult;
};

const Plot = createPlotlyComponent(Plotly);

export function ReflectanceChart({ result }: ReflectanceChartProps) {
  return (
    <Plot
      className="reflectance-chart"
      data={[
        {
          x: result.spectrum.map((point) => point.wavelengthNm),
          y: result.spectrum.map((point) => point.reflectance),
          type: 'scatter',
          mode: 'lines',
          name: 'Reflectance',
          line: {
            color: '#5aa7c8',
            width: 3,
          },
          hovertemplate: '%{x:.1f} nm<br>R=%{y:.4f}<extra></extra>',
        },
      ]}
      layout={{
        autosize: true,
        paper_bgcolor: '#101720',
        plot_bgcolor: '#101720',
        font: {
          color: '#dce7f2',
          family: 'Inter, system-ui, sans-serif',
        },
        margin: {
          t: 18,
          r: 22,
          b: 56,
          l: 62,
        },
        xaxis: {
          title: {
            text: 'Wavelength (nm)',
          },
          gridcolor: '#263443',
          zerolinecolor: '#334457',
        },
        yaxis: {
          title: {
            text: 'Reflectance',
          },
          range: [0, 1],
          gridcolor: '#263443',
          zerolinecolor: '#334457',
        },
        showlegend: false,
      }}
      config={{
        displaylogo: false,
        responsive: true,
      }}
      useResizeHandler
    />
  );
}
