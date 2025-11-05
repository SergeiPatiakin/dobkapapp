import { Container, Stack } from "@mui/material"
import reactLogo from "./assets/react.svg"

interface DevPageProps {}

export const DevPage = (_props: DevPageProps) => {
  return <Container>
    <Stack spacing={1} style={{ paddingTop: '8px'}}>
    <h2>Dev</h2>
    <div className="row">
      <a href="https://vitejs.dev" target="_blank">
        <img src="/vite.svg" width="100px" className="logo vite" alt="Vite logo" />
      </a>
      <a href="https://tauri.app" target="_blank">
        <img src="/tauri.svg" width="100px" className="logo tauri" alt="Tauri logo" />
      </a>
      <a href="https://reactjs.org" target="_blank">
        <img src={reactLogo} width="100px" className="logo react" alt="React logo" />
      </a>
    </div>
    <p>Click on the Tauri, Vite, and React logos to learn more.</p>
    </Stack>
  </Container>
}
