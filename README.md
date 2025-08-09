# 🐂 LeiloApp

![Electron](https://img.shields.io/badge/Electron-3B475C?style=for-the-badge&logo=electron&logoColor=9FEAF9)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)

> Sistema desktop para **controle de leilões** com cadastro de eventos, lotes, GC em tempo real, controle de lances e relatórios completos.

---

## 📑 Sumário
1. [📜 Sobre](#-sobre)
2. [🚀 Funcionalidades](#-funcionalidades)
3. [🛠️ Tecnologias](#️-tecnologias)
4. [📦 Instalação](#-instalação)
5. [📁 Estrutura de Pastas](#-estrutura-de-pastas)
6. [📷 Capturas de Tela](#-capturas-de-tela)
7. [📜 Licença](#-licença)
8. [✨ Autor](#-autor)

---

## 📜 Sobre
O **LeiloApp** é um aplicativo desktop desenvolvido em **Electron + React** para **gestão completa de leilões**.  
Ideal para leiloeiros e organizadores de eventos, ele centraliza o controle de lotes, exibe GCs ao vivo, gerencia lances em tempo real e gera relatórios financeiros detalhados.

---

## 🚀 Funcionalidades

### 📅 Eventos
- Cadastro com **data, hora, descrição e condição de pagamento padrão**.
- Contagem regressiva automática até o início.
- Encerramento de evento com registro de horário.
- Listagem com totais de lotes e lances.

### 🐄 Lotes
- Cadastro manual ou importação via **planilha Excel**.
- Marcar como "em pista" para receber lances.
- Histórico detalhado de todos os lances.

### 🎯 GC Duas Linhas
- Cadastro de nome e cargo.
- Botão **"Colocar no Ar"** para definir o GC ativo.
- Atualização em tempo real no módulo GC No Ar.

### 📊 Relatórios
- Listagem com:
  - ID, lote, nome do animal, valor vendido, condição de pagamento e valor total.
  - Horários de início e término.
  - **Soma total** de vendas do evento.

### 💻 Extras
- Servidor local Express para integração com **vMix** e outros sistemas.
- Formatação de valores no **padrão brasileiro**.
- Integração com menu nativo do sistema operacional.
- Suporte a ícones e nome customizado no menu do SO.

---

## 🛠️ Tecnologias
- **Electron** (Vite + Tailwind + ShadCN UI)
- **React** + **TypeScript**
- **SQLite** (`better-sqlite3`)
- **Express.js** (API local)
- **date-fns**
- **xlsx**

---

## 📦 Instalação

### 1️⃣ Clonar repositório
```bash
git clone https://github.com/seuusuario/leiloapp.git
cd leiloapp
