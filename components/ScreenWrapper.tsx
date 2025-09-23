import { YStack } from 'tamagui'
import { ReactNode } from 'react'

interface ScreenWrapperProps {
    children: ReactNode
    maxWidth?: number
    centered?: boolean
}

export function ScreenWrapper({
    children,
    maxWidth = 1200,
    centered = false
}: ScreenWrapperProps) {
    return (
        <YStack flex={1} bg="$background">
            <YStack
                flex={1}
                gap="$4"
                px="$4"
                pt="$6"
                maxW={maxWidth}
                width={"100%"}
                self="center"
                $sm={{ px: "$6" }}
                $md={{ px: "$8" }}
                {...(centered && {
                    items: "center",
                    justify: "center"
                })}
            >
                {children}
            </YStack>
        </YStack>
    )
}
