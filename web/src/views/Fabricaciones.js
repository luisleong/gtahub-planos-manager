import React, { useEffect, useState } from 'react';
import { CCard, CCardBody, CCardHeader, CRow, CCol, CProgressBar, CSpinner } from '@coreui/react';

const API_URL = 'http://localhost:3001/fabricaciones';

function calcularProgreso(fab) {
  const inicio = new Date(fab.timestamp_colocacion);
  const fin = new Date(inicio.getTime() + fab.plano_duracion * 60000);
  const ahora = new Date();
  const total = fin - inicio;
  const transcurrido = ahora - inicio;
  let porcentaje = Math.min(100, Math.max(0, Math.round((transcurrido / total) * 100)));
  let tiempoRestante = Math.max(0, Math.ceil((fin - ahora) / 60000));
  return { porcentaje, tiempoRestante };
}

const Fabricaciones = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 className="mb-4">Fabricaciones</h2>
      {loading ? <CSpinner color="primary" /> : (
        <CRow xs={{ cols: 1 }} md={{ cols: 2 }} lg={{ cols: 3 }} className="g-4">
          {data.map(fab => {
            const { porcentaje, tiempoRestante } = calcularProgreso(fab);
            return (
              <CCol key={fab.id}>
                <CCard className="shadow-lg border-0 position-relative" style={{ overflow: 'hidden' }}>
                  <div style={{
                    backgroundImage: `url(${fab.foto})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    height: '200px',
                    filter: 'brightness(0.7)',
                  }} />
                  <CCardBody className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-end" style={{ color: 'white', background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.8) 100%)' }}>
                    <h4>{fab.plano_nombre}</h4>
                    <div className="mb-2">Localización: <strong>{fab.localizacion_nombre}</strong></div>
                    <div className="mb-2">Propietario: <strong>{fab.propietario}</strong></div>
                    <div className="mb-2">Estado: <strong>{fab.estado}</strong></div>
                    <div className="mb-2">Última actualización: {fab.ultima_actualizacion}</div>
                    <div className="mb-2">Tiempo restante: <strong>{tiempoRestante} min</strong></div>
                    <CProgressBar value={porcentaje} color={porcentaje === 100 ? 'success' : 'info'} className="mb-2" />
                    <div className="mb-2">Progreso: <strong>{porcentaje}%</strong></div>
                  </CCardBody>
                </CCard>
              </CCol>
            );
          })}
        </CRow>
      )}
    </div>
  );
};

export default Fabricaciones;
