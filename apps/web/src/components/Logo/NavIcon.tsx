import HolidayUniIcon from 'components/Logo/HolidayUniIcon'
import { SVGProps } from 'components/Logo/UniIcon'
import styled from 'lib/styled-components'
import { useMemo } from 'react'
import { useIsDarkMode } from 'ui/src/hooks/useIsDarkMode'

function Logo({ onClick }: { onClick?: () => void }) {
  const isDarkMode = useIsDarkMode()
  const fillColor = useMemo(() => (isDarkMode ? 'white' : 'black'), [isDarkMode])
  return (
    <div style={{ scale: '0.30', position: 'absolute', left: '-90px' }}>
      <svg width="303" height="98" viewBox="0 0 303 98" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M32.1989 0L0 65.66L32.1989 98L64.3977 65.66L59.5679 55.811L32.1989 83.3L11.7087 62.72L16.5301 52.8932L32.1989 68.11L54.4505 45.3755L32.1989 0Z"
          fill={fillColor}
        />
        <path
          d="M121.878 83.1371C114.923 83.1371 108.627 79.8332 105.337 74.3582H105.055V82.6651H96.5966V14.7H105.431V43.1132H105.713C109.096 37.5438 115.205 34.24 121.878 34.24C134.66 34.24 142.931 43.8684 142.931 58.7829C142.931 73.6031 134.66 83.1371 121.878 83.1371ZM105.055 58.7829C105.055 69.3553 110.6 75.963 119.529 75.963C128.457 75.963 134.096 69.4497 134.096 58.7829C134.096 48.0218 128.457 41.4141 119.529 41.4141C110.694 41.4141 105.055 48.1162 105.055 58.7829Z"
          fill={fillColor}
        />
        <path
          d="M175.412 83.1371C161.315 83.1371 151.728 73.3199 151.728 58.7829C151.728 44.1515 161.409 34.24 175.412 34.24C189.698 34.24 199.284 44.1515 199.284 58.7829C199.284 73.3199 189.698 83.1371 175.412 83.1371ZM160.657 58.7829C160.657 69.4497 166.296 75.963 175.412 75.963C184.623 75.963 190.45 69.4497 190.45 58.7829C190.45 48.0218 184.717 41.4141 175.412 41.4141C166.296 41.4141 160.657 48.0218 160.657 58.7829Z"
          fill={fillColor}
        />
        <path
          d="M210.526 82.6651V75.6798H228.947V21.6853H210.526V14.7H237.781V75.6798H254.604V82.6651H210.526Z"
          fill={fillColor}
        />
        <path
          d="M289.278 82.6651C279.034 82.6651 273.583 77.0957 273.583 66.901V41.6972H258.828V34.7119H270.857C272.831 34.7119 273.959 33.5792 273.959 31.6913V20.5525H282.324V34.7119H303V41.6972H282.324V67.0898C282.324 72.6591 285.237 75.6798 290.782 75.6798H303V82.6651H289.278Z"
          fill={fillColor}
        />
      </svg>
    </div>
  )
}

const Container = styled.div<{ clickable?: boolean }>`
  position: relative;
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'auto')};
  display: flex;
  justify-content: center;
  align-items: center;
`

type NavIconProps = SVGProps & {
  clickable?: boolean
  onClick?: () => void
}

export const NavIcon = ({ clickable, onClick, ...props }: NavIconProps) => (
  <Container clickable={clickable}>
    {HolidayUniIcon(props) !== null ? <HolidayUniIcon {...props} /> : <Logo onClick={onClick} />}
  </Container>
)
