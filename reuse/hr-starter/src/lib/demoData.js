export const stations = [
  { id: 'central', name: 'Estación Central', address: 'Zona Centro', coverage: 'Centro y Zona Río' },
  { id: 'otay', name: 'Estación Otay', address: 'Mesa de Otay', coverage: 'Otay y aeropuerto' },
  { id: 'playas', name: 'Estación Playas', address: 'Playas de Tijuana', coverage: 'Playas y zona costera' },
  { id: 'la-presas', name: 'Estación La Presa', address: 'La Presa', coverage: 'Este de la ciudad' },
  { id: 'sanchez-taboada', name: 'Estación Sánchez Taboada', address: 'Sánchez Taboada', coverage: 'Sur de Tijuana' },
]

export const demoEmployees = [
  { id: 'BT-1042', fullName: 'María Fernanda Ruiz', position: 'Jefa de estación', station: 'central', unit: 'Mando 01', shift: 'Administrativo', status: 'Activo' },
  { id: 'BT-1087', fullName: 'Carlos Alberto Medina', position: 'Bombero', station: 'central', unit: 'Bomba 01', shift: 'A', status: 'Activo' },
  { id: 'BT-1126', fullName: 'José Luis Cárdenas', position: 'Operador', station: 'otay', unit: 'Bomba 12', shift: 'B', status: 'Activo' },
  { id: 'BT-1193', fullName: 'Ana Sofía Navarro', position: 'Paramédica', station: 'playas', unit: 'Ambulancia 07', shift: 'C', status: 'Activo' },
  { id: 'BT-1218', fullName: 'Miguel Ángel Torres', position: 'Bombero', station: 'la-presas', unit: 'Bomba 18', shift: 'A', status: 'Activo' },
  { id: 'BT-1274', fullName: 'Daniela López García', position: 'Bombera', station: 'sanchez-taboada', unit: 'Rescate 03', shift: 'B', status: 'Activo' },
  { id: 'BT-1305', fullName: 'Roberto Carlos Vega', position: 'Bombero', station: 'otay', unit: 'Bomba 12', shift: 'C', status: 'Licencia' },
  { id: 'BT-1341', fullName: 'Elena Patricia Mora', position: 'Administrativa', station: 'central', unit: 'Recursos Humanos', shift: 'Administrativo', status: 'Activo' },
]

export function stationName(stationId) {
  return stations.find((station) => station.id === stationId)?.name ?? 'Sin estación'
}