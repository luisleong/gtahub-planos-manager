import React, { useEffect, useState, useRef } from 'react';
import { CCard, CCardBody, CCardHeader, CButton, CSpinner, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CModal, CModalHeader, CModalBody, CModalFooter, CForm, CFormInput, CFormLabel, CFormText, CInputGroup, CInputGroupText } from '@coreui/react';
import { cilPencil, cilTrash, cilPlus, cilCheckCircle, cilXCircle, cilImage } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const API_URL = 'http://localhost:3001/localizaciones';

const Localizaciones = () => {
  const fileInputRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', foto_url: '', disponible_para_fabricacion: true });
  const [editId, setEditId] = useState(null);
  const [file, setFile] = useState(null);
  const [showImgModal, setShowImgModal] = useState(false);
  const [imgModalSrc, setImgModalSrc] = useState('');

  useEffect(() => {
    fetch(API_URL)
      .then(async res => {
        if (!res.ok) {
          // Si el backend responde con error, loguea y retorna array vacío
          const text = await res.text();
          console.error('[FRONT] Error al cargar localizaciones:', text);
          setData([]);
          setLoading(false);
          return;
        }
        return res.json();
      })
      .then(data => {
        // Si data no es array, fuerza array vacío
        if (!Array.isArray(data)) {
          setData([]);
        } else {
          setData(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('[FRONT] Error inesperado al cargar localizaciones:', err);
        setData([]);
        setLoading(false);
      });
  }, []);

  const handleOpenModal = () => {
    setForm({ nombre: '', foto_url: '', disponible_para_fabricacion: true });
    setFile(null);
    setEditId(null);
    setShowModal(true);
  };
  const handleEdit = (loc) => {
    setForm({
      nombre: loc.nombre,
      foto_url: loc.foto_url,
      disponible_para_fabricacion: loc.disponible_para_fabricacion
    });
    setFile(null);
    setEditId(loc.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setForm(prev => ({ ...prev, foto_url: '' }));
  };

  // Pegar imagen desde portapapeles
  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        setFile(blob);
        setForm(prev => ({ ...prev, foto_url: '' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let fotoUrl = form.foto_url;
    console.log('[FRONT] handleSubmit: file:', file);
    if (file) {
      // Subir imagen al backend y obtener la URL cruda de GitHub
      const formData = new FormData();
      formData.append('imagen', file);
      console.log('[FRONT] Enviando imagen al backend:', file.name, 'size:', file.size);
      const res = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      console.log('[FRONT] Respuesta backend upload:', data);
      fotoUrl = data.url;
    }
    let resLoc, dataLoc;
    try {
      if (editId) {
        // Editar localización existente
        console.log('[FRONT] Editando localización:', editId);
        resLoc = await fetch(`${API_URL}/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: form.nombre, foto: fotoUrl, disponible: form.disponible_para_fabricacion })
        });
      } else {
        // Crear nueva localización
        console.log('[FRONT] Creando localización con foto_url:', fotoUrl);
        resLoc = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: form.nombre, foto: fotoUrl, disponible: form.disponible_para_fabricacion })
        });
      }
      if (!resLoc.ok) {
        const text = await resLoc.text();
        console.error('[FRONT] Error backend localización:', text);
        alert('Error al guardar localización: ' + text);
        return;
      }
      dataLoc = await resLoc.json();
      console.log('[FRONT] Respuesta backend localización:', dataLoc);
    } catch (err) {
      console.error('[FRONT] Error inesperado:', err);
      alert('Error inesperado al guardar localización.');
      return;
    }
    setShowModal(false);
    window.location.reload();
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        console.error('[FRONT] Error al borrar localización:', text);
        alert('Error al borrar localización: ' + text);
        return;
      }
      window.location.reload();
    } catch (err) {
      console.error('[FRONT] Error inesperado al borrar localización:', err);
      alert('Error inesperado al borrar localización.');
    }
  };

  // TODO: handleEdit (similar a agregar, pero con datos precargados)

  return (
    <CCard className="mb-4">
      <CCardHeader>
        Localizaciones
        <CButton color="success" className="float-end" onClick={handleOpenModal}>
          <CIcon icon={cilPlus} /> Agregar
        </CButton>
      </CCardHeader>
      <CCardBody>
        {loading ? <CSpinner color="primary" /> : (
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>ID</CTableHeaderCell>
                <CTableHeaderCell>Nombre</CTableHeaderCell>
                <CTableHeaderCell>Foto</CTableHeaderCell>
                <CTableHeaderCell>Disponible</CTableHeaderCell>
                <CTableHeaderCell>Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {data.map(loc => (
                <CTableRow key={loc.id}>
                  <CTableDataCell>{loc.id}</CTableDataCell>
                  <CTableDataCell>{loc.nombre}</CTableDataCell>
                  <CTableDataCell>
                    <img
                      src={loc.foto_url}
                      alt={loc.nombre}
                      style={{ width: 60, borderRadius: 8, cursor: 'pointer' }}
                      onClick={() => { setImgModalSrc(loc.foto_url); setShowImgModal(true); }}
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = '/assets/images/placeholder.png';
                      }}
                    />
                  </CTableDataCell>
                  <CTableDataCell>
                    {loc.disponible_para_fabricacion ? (
                      <CIcon icon={cilCheckCircle} style={{ color: 'green', fontSize: 24 }} />
                    ) : (
                      <CIcon icon={cilXCircle} style={{ color: 'red', fontSize: 24 }} />
                    )}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CButton color="info" size="sm" className="me-2" onClick={() => handleEdit(loc)}>
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton color="danger" size="sm" onClick={() => handleDelete(loc.id)}>
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>
      {/* Modal para imagen grande */}
      <CModal visible={showImgModal} onClose={() => setShowImgModal(false)} size="xl">
        <CModalHeader>Vista de Imagen</CModalHeader>
        <CModalBody style={{ textAlign: 'center' }}>
          <img
            src={imgModalSrc}
            alt="Vista"
            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12 }}
            onError={e => {
              e.target.onerror = null;
              e.target.src = '/assets/images/placeholder.png';
            }}
          />
        </CModalBody>
      </CModal>
      {/* Modal para agregar localización */}
      <CModal visible={showModal} onClose={handleCloseModal}>
        <CModalHeader>Agregar Localización</CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleSubmit} onPaste={handlePaste}>
            <CFormLabel htmlFor="nombre">Nombre</CFormLabel>
            <CFormInput type="text" id="nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
            <div className="mt-3 mb-2">
              <CFormLabel>Foto</CFormLabel>
              <div style={{ display: 'flex', gap: 12 }}>
                <CButton color={file ? 'secondary' : 'primary'} variant="outline" onClick={() => { setFile(null); }}>
                  <CIcon icon={cilImage} /> URL
                </CButton>
                <CButton
                  color={file ? 'primary' : 'secondary'}
                  variant="outline"
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <CIcon icon={cilImage} /> Subir
                </CButton>
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>
              {!file ? (
                <CInputGroup className="mt-2">
                  <CInputGroupText>URL</CInputGroupText>
                  <CFormInput type="text" id="foto_url" name="foto_url" value={form.foto_url} onChange={handleChange} placeholder="Pega la URL de la imagen" />
                </CInputGroup>
              ) : (
                <CFormText className="mt-2">Archivo seleccionado: {file.name}</CFormText>
              )}
            </div>
            {/* El campo Disponible para fabricación se oculta en la creación y se agregará en la edición */}
            <CButton color="success" type="submit" className="mt-4 w-100">Guardar</CButton>
          </CForm>
        </CModalBody>
      </CModal>
    </CCard>
  );
};

export default Localizaciones;
